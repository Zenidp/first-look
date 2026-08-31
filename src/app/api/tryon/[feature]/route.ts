import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getFeature, isFeatureId, type FeatureId } from "@/lib/perfectcorp/features";
import { PerfectCorpError, runTask, uploadImage } from "@/lib/perfectcorp/client";
import { buildPayload, cacheableOptions, PayloadError } from "@/lib/perfectcorp/payload";
import {
  fixtureKey,
  forceLive,
  hashBytes,
  offline,
  readFixture,
  writeFixture,
} from "@/lib/perfectcorp/fixtures";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/tryon/<feature>
 *
 * One handler for every Perfect Corp feature in the registry. multipart/form-data:
 *
 *   photo      File          the bride's photo (repeat 3x for hair type/frizziness)
 *   reference  File          product or style photo, when the feature takes one
 *   options    JSON string   { templateId, preset, gender, style, garmentCategory,
 *                              hairColor, effects, effect, effectType, index }
 *
 * Cache is consulted before any upload happens, so a repeat request costs
 * nothing at all — not even the free calls.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/tryon/[feature]">) {
  const startedAt = Date.now();
  const { feature: raw } = await ctx.params;

  if (!isFeatureId(raw)) {
    return bad(`Unknown feature "${raw}"`, "UnknownFeature", 404);
  }
  const feature: FeatureId = raw;
  const f = getFeature(feature);

  try {
    // A request with no body at all throws here rather than returning an empty
    // form, which would surface as a 500 for what is really a malformed request.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return bad("expected multipart/form-data with a 'photo' field", "BadRequestBody");
    }

    const photos = form.getAll("photo").filter((v): v is File => v instanceof File);
    if (photos.length === 0) return bad("at least one 'photo' is required", "MissingPhoto");

    const expected = f.sourcePhotos ?? 1;
    if (photos.length !== expected) {
      return bad(
        expected === 3
          ? `${f.label} needs exactly 3 photos in order: front, right, left`
          : `${f.label} takes exactly 1 photo`,
        "WrongPhotoCount",
      );
    }

    const referenceFile = form.get("reference");
    const reference = referenceFile instanceof File ? referenceFile : null;
    // A reference can instead name an entry in the Nusantara library, so the
    // kebaya and regional-makeup sets do not have to be re-uploaded each time.
    const referenceIdRaw = form.get("referenceId");
    const referenceId = typeof referenceIdRaw === "string" ? referenceIdRaw : "";

    let options: Record<string, unknown> = {};
    const rawOptions = form.get("options");
    if (typeof rawOptions === "string" && rawOptions.trim()) {
      try {
        options = JSON.parse(rawOptions) as Record<string, unknown>;
      } catch {
        return bad("'options' must be valid JSON", "BadOptions");
      }
    }

    // Read bytes up front: needed for both the size check and the cache key.
    const photoBytes: Uint8Array[] = [];
    for (const p of photos) {
      const b = new Uint8Array(await p.arrayBuffer());
      if (b.byteLength > MAX_BYTES) return bad("a photo exceeds the 10 MB limit", "FileTooLarge");
      photoBytes.push(b);
    }
    let refBytes: Uint8Array | null = null;
    let refName = "reference.jpg";

    if (reference) {
      refBytes = new Uint8Array(await reference.arrayBuffer());
      refName = reference.name || refName;
    } else if (referenceId) {
      // Reject anything that is not a bare slug before it reaches the path.
      if (!/^[a-z0-9-]+$/.test(referenceId)) {
        return bad("referenceId must be a plain slug", "BadReferenceId");
      }
      try {
        refBytes = new Uint8Array(
          await readFile(path.join(process.cwd(), "public", "references", `${referenceId}.jpg`)),
        );
        refName = `${referenceId}.jpg`;
      } catch {
        return bad(
          `No image in the reference library for "${referenceId}". Add public/references/${referenceId}.jpg.`,
          "ReferenceNotFound",
          404,
        );
      }
    }

    if (refBytes && refBytes.byteLength > MAX_BYTES) {
      return bad("reference image exceeds the 10 MB limit", "FileTooLarge");
    }

    // Validate the option set first, ahead of the cache and the offline gate.
    // An invalid request should report as invalid whatever the cache state is;
    // answering "offline cache miss" to a request that was missing `gender`
    // sends you chasing the wrong problem. buildPayload is pure, so a throwaway
    // call with placeholder ids costs nothing.
    buildPayload(feature, {
      srcFileIds: Array.from({ length: photos.length }, (_, i) => `pending-${i}`),
      refFileId: refBytes ? "pending-ref" : undefined,
      options,
    });

    const identity = cacheableOptions(feature, options);
    const imageHashes = photoBytes.map(hashBytes);
    if (refBytes) imageHashes.push(hashBytes(refBytes));
    const key = fixtureKey(feature, identity, imageHashes);

    // --- cache first, before spending anything ------------------------------
    if (!forceLive()) {
      const cached = await readFixture(key);
      if (cached) {
        return NextResponse.json({
          feature,
          source: "fixture" as const,
          imageUrl: cached.imagePath,
          data: cached.data,
          unitsSpent: 0,
          unitsSavedByCache: cached.unitsSpent,
          originallyTookMs: cached.elapsedMs,
          totalMs: Date.now() - startedAt,
          key,
        });
      }
    }

    if (offline()) {
      return bad(
        "PERFECTCORP_OFFLINE=1 and no fixture exists for these inputs. No credits were spent.",
        "OfflineCacheMiss",
        409,
      );
    }

    // --- live ----------------------------------------------------------------
    const srcFileIds: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      srcFileIds.push(await uploadImage(photoBytes[i], photos[i].name || `photo-${i}.jpg`));
    }
    const refFileId = refBytes
      ? await uploadImage(refBytes, refName)
      : undefined;

    // Throws PayloadError before any billable call if the inputs are wrong.
    const payload = buildPayload(feature, { srcFileIds, refFileId, options });

    const result = await runTask(feature, payload);

    const fixture = await writeFixture(
      {
        key,
        feature,
        inputs: identity,
        data: result.data,
        taskId: result.taskId,
        unitsSpent: result.unitsSpent,
        elapsedMs: result.elapsedMs,
        polls: result.polls,
        createdAt: new Date().toISOString(),
      },
      result.url,
    );

    return NextResponse.json({
      feature,
      source: "live" as const,
      imageUrl: fixture.imagePath,
      data: result.data,
      upstreamUrl: result.url,
      unitsSpent: result.unitsSpent,
      taskId: result.taskId,
      pollMs: result.elapsedMs,
      polls: result.polls,
      totalMs: Date.now() - startedAt,
      key,
    });
  } catch (err) {
    if (err instanceof PayloadError) {
      // Caught before the billable call — worth saying so.
      return bad(`${err.message} (no credits spent)`, err.code);
    }
    if (err instanceof PerfectCorpError) {
      console.error(`[tryon/${feature}] ${err.code}: ${err.message}`);
      return bad(err.message, err.code, err.httpStatus === 401 ? 401 : 502);
    }
    console.error(`[tryon/${feature}] unexpected:`, err);
    return bad("Unexpected server error", "Unexpected", 500);
  }
}

/** Metadata for one feature. Free. */
export async function GET(_request: Request, ctx: RouteContext<"/api/tryon/[feature]">) {
  const { feature } = await ctx.params;
  if (!isFeatureId(feature)) return bad(`Unknown feature "${feature}"`, "UnknownFeature", 404);
  const f = getFeature(feature);
  return NextResponse.json({
    id: feature,
    ...f,
    endpoint: `/s2s/${f.version}/task/${f.task}`,
    offline: offline(),
    forceLive: forceLive(),
  });
}

function bad(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}
