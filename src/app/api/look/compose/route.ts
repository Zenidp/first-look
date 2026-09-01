import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { PerfectCorpError } from "@/lib/perfectcorp/client";
import { isFeatureId } from "@/lib/perfectcorp/features";
import { PayloadError } from "@/lib/perfectcorp/payload";
import { OfflineCacheMiss, runFeature, unitsFor, type RunPhoto } from "@/lib/perfectcorp/run";
import { getRecipe, type LookStep } from "@/lib/look";
import { REFERENCE_LIBRARY } from "@/lib/references";

export const runtime = "nodejs";
// Five live compositing calls at 6-11s each, plus uploads. A fully cached
// replay finishes in milliseconds; this budget is for the first run.
export const maxDuration = 300;

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/look/compose
 *
 * Runs a chain of try-ons, each one against the previous one's output, and
 * returns the finished look plus every intermediate stage.
 *
 * multipart/form-data:
 *   photo    File          the bride's waist-up photo
 *   recipe   string        id from LOOK_RECIPES
 *   steps    JSON string   optional: overrides the recipe's steps entirely
 *
 * Billing: the chain stops at the first failing step and reports what was
 * already spent. It does NOT retry — a step that fails after being accepted
 * has already been charged (FINDINGS section 3), so a retry loop is a way to
 * spend units twice on the same broken input.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("expected multipart/form-data with a 'photo' field", "BadRequestBody");
  }

  const photo = form.get("photo");
  if (!(photo instanceof File)) return bad("a 'photo' file is required", "MissingPhoto");

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return bad("photo exceeds the 10 MB limit", "FileTooLarge");

  const steps = await resolveSteps(form);
  if ("error" in steps) return bad(steps.error, steps.code);

  // --- run the chain --------------------------------------------------------
  let current: RunPhoto = { bytes, name: photo.name || "look.jpg" };
  const stages: Array<Record<string, unknown>> = [];
  let unitsSpent = 0;
  let unitsSavedByCache = 0;

  for (const step of steps.steps) {
    let reference: RunPhoto | undefined;
    const options = { ...(step.options ?? {}) };

    if (step.referenceId) {
      const loaded = await loadReference(step.referenceId, options);
      if ("error" in loaded) return bad(loaded.error, loaded.code, 404);
      reference = loaded.reference;
    }

    try {
      const outcome = await runFeature({
        feature: step.feature,
        photos: [current],
        reference,
        options,
      });

      unitsSpent += outcome.unitsSpent;
      unitsSavedByCache += outcome.unitsSavedByCache;

      stages.push({
        feature: step.feature,
        label: step.label,
        source: outcome.source,
        imageUrl: outcome.mediaUrl,
        unitsSpent: outcome.unitsSpent,
        unitsSavedByCache: outcome.unitsSavedByCache,
        elapsedMs: outcome.elapsedMs,
        key: outcome.key,
      });

      // The next step composites onto this result, so it needs the actual
      // bytes. A fixture hit whose mirrored file is missing cannot be chained —
      // stop rather than silently continuing from the previous stage, which
      // would produce a look that is missing a layer without saying so.
      if (!outcome.bytes) {
        return NextResponse.json(
          {
            error:
              `Step "${step.label}" produced no local image to build on. ` +
              "The chain needs each result mirrored to disk; on a read-only " +
              "filesystem only fully pre-cached chains can run.",
            code: "ChainBroken",
            stages,
            unitsSpent,
            unitsSavedByCache,
          },
          { status: 409 },
        );
      }
      current = { bytes: outcome.bytes, name: `${outcome.key}.jpg` };
    } catch (err) {
      const { message, code, status, billed } = describe(err);
      // An engine error on an ACCEPTED task is still charged (FINDINGS
      // section 3), so the failing step's units have to be added to the total
      // or the report understates the spend. Only failures rejected before
      // creation — a bad payload, an offline cache miss — are free.
      const spent = unitsSpent + (billed ? unitsFor(step.feature, options) : 0);
      // Report the partial chain: the caller needs to see which layers landed
      // and what the run already cost before it broke.
      return NextResponse.json(
        {
          error: `Step "${step.label}" (${step.feature}) failed: ${message}`,
          code,
          stages,
          unitsSpent: spent,
          unitsSavedByCache,
          failedStep: { feature: step.feature, label: step.label, billed },
          totalMs: Date.now() - startedAt,
        },
        { status },
      );
    }
  }

  const final = stages[stages.length - 1];
  return NextResponse.json({
    recipe: steps.recipeId,
    imageUrl: final?.imageUrl,
    stages,
    unitsSpent,
    unitsSavedByCache,
    totalMs: Date.now() - startedAt,
  });
}

/** The recipe catalogue, so the UI does not have to hardcode it. Free. */
export async function GET() {
  const { LOOK_RECIPES } = await import("@/lib/look");
  return NextResponse.json({ recipes: LOOK_RECIPES });
}

// --- helpers ----------------------------------------------------------------

async function resolveSteps(
  form: FormData,
): Promise<{ steps: LookStep[]; recipeId?: string } | { error: string; code: string }> {
  const raw = form.get("steps");
  if (typeof raw === "string" && raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "'steps' must be valid JSON", code: "BadSteps" };
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "'steps' must be a non-empty array", code: "BadSteps" };
    }
    for (const s of parsed) {
      const feature = (s as LookStep)?.feature;
      if (typeof feature !== "string" || !isFeatureId(feature)) {
        return { error: `Unknown feature "${String(feature)}" in steps`, code: "UnknownFeature" };
      }
    }
    return { steps: parsed as LookStep[] };
  }

  const recipeId = form.get("recipe");
  if (typeof recipeId !== "string" || !recipeId) {
    return { error: "provide either 'recipe' or 'steps'", code: "MissingRecipe" };
  }
  const recipe = getRecipe(recipeId);
  if (!recipe) return { error: `Unknown recipe "${recipeId}"`, code: "UnknownRecipe" };
  return { steps: recipe.steps, recipeId };
}

async function loadReference(
  id: string,
  options: Record<string, unknown>,
): Promise<{ reference: RunPhoto } | { error: string; code: string }> {
  // Reject anything that is not a bare slug before it reaches the path.
  if (!/^[a-z0-9-]+$/.test(id)) {
    return { error: "referenceId must be a plain slug", code: "BadReferenceId" };
  }
  try {
    const bytes = new Uint8Array(
      await readFile(path.join(process.cwd(), "public", "references", `${id}.jpg`)),
    );
    // Placement parameters travel with the product, not the request.
    const entry = REFERENCE_LIBRARY.find((r) => r.id === id);
    if (entry?.parameter && options.parameter === undefined) {
      options.parameter = entry.parameter;
    }
    return { reference: { bytes, name: `${id}.jpg` } };
  } catch {
    return { error: `No image in the reference library for "${id}"`, code: "ReferenceNotFound" };
  }
}

/**
 * `billed` answers the only question that matters for the running total: did
 * this failure happen after the task was created? Creation-time rejections are
 * free; engine errors on an accepted task are not.
 */
function describe(err: unknown): {
  message: string;
  code: string;
  status: number;
  billed: boolean;
} {
  if (err instanceof PayloadError) {
    return {
      message: `${err.message} (no credits spent)`,
      code: err.code,
      status: 400,
      billed: false,
    };
  }
  if (err instanceof OfflineCacheMiss) {
    return { message: err.message, code: err.code, status: 409, billed: false };
  }
  if (err instanceof PerfectCorpError) {
    // An HTTP 4xx from the platform is a rejection at creation: nothing ran.
    // Anything else — an engine error surfaced through polling, a timeout —
    // means a task existed, so assume it was charged.
    const rejectedAtCreation =
      typeof err.httpStatus === "number" && err.httpStatus >= 400 && err.httpStatus < 500;
    return {
      message: err.message,
      code: err.code,
      status: err.httpStatus === 401 ? 401 : 502,
      billed: !rejectedAtCreation,
    };
  }
  console.error("[look/compose] unexpected:", err);
  return { message: "Unexpected server error", code: "Unexpected", status: 500, billed: false };
}

function bad(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}
