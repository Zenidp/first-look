import { NextResponse } from "next/server";

import { PerfectCorpError, createTask, runTask, uploadImage } from "@/lib/perfectcorp/client";
import { PayloadError, buildPayload } from "@/lib/perfectcorp/payload";
import { forceLive, offline, readFixture, writeFixture } from "@/lib/perfectcorp/fixtures";
import { identityFor, unitsFor } from "@/lib/perfectcorp/run";
import { getPendingTaskByKey, putPendingTask } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const FEATURE = "imageToVideo" as const;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/video — start a clip, do not wait for it.
 *
 * Video is the one feature that cannot be created and polled in the same
 * request. A 5-second clip was measured at 61.6s (FINDINGS §9), against a
 * serverless function budget that may be 60. So this returns a task id and
 * `/api/video/<taskId>` reads the outcome later, each request staying short.
 *
 * The cache key and the real unit cost are computed here and parked
 * server-side, never handed to the client. Video does not bill a flat rate —
 * 1/2/3 units per second by resolution — so the figure has to travel with the
 * task, and a client that could name its own key could file a result over
 * someone else's cache entry.
 *
 * Falls back to blocking when there is no database to park anything in, which
 * is correct for local development and honest about what it is doing.
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

  let options: Record<string, unknown> = {};
  const raw = form.get("options");
  if (typeof raw === "string" && raw.trim()) {
    try {
      options = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return bad("'options' must be valid JSON", "BadOptions");
    }
  }

  const input = {
    feature: FEATURE,
    photos: [{ bytes, name: photo.name || "look.jpg" }],
    options,
  };

  try {
    // Validate before anything is uploaded. A rejected task still bills once it
    // has been created, so the only reliably free failure is an early one.
    buildPayload(FEATURE, { srcFileIds: ["pending-0"], options });

    const { identity, key } = identityFor(input);

    if (!forceLive()) {
      const cached = await readFixture(key);
      if (cached) {
        return NextResponse.json({
          status: "success",
          source: "fixture",
          url: cached.imagePath,
          unitsSpent: 0,
          unitsSavedByCache: cached.unitsSpent,
          key,
          totalMs: Date.now() - startedAt,
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

    // Before paying: is this exact clip already being rendered?
    //
    // A render outlives the request that starts it, so the browser polls for
    // it. Close the tab, or let a slow render outlast the poll, and nobody ever
    // collects the result — the task still completes, still bills, and no
    // fixture is written. Without this check the next attempt at the same look
    // computes the same key, misses the cache and pays for the identical clip
    // again. Rejoining costs nothing and is always the right answer, because
    // the units for that task are already gone.
    const alreadyRunning = await getPendingTaskByKey(key);
    if (alreadyRunning) {
      return NextResponse.json({
        status: "pending",
        taskId: alreadyRunning.task_id,
        key,
        units: alreadyRunning.units,
        resumed: true,
        totalMs: Date.now() - startedAt,
      });
    }

    const units = unitsFor(FEATURE, options);
    const srcFileId = await uploadImage(bytes, photo.name || "look.jpg");
    const payload = buildPayload(FEATURE, { srcFileIds: [srcFileId], options });

    // Everything above this line is free. This is the billable moment.
    const taskId = await createTask(FEATURE, payload);

    const parked = await putPendingTask({
      task_id: taskId,
      key,
      feature: FEATURE,
      inputs: identity,
      media_type: "video",
      units,
    });

    if (parked) {
      return NextResponse.json({
        status: "pending",
        taskId,
        key,
        units,
        totalMs: Date.now() - startedAt,
      });
    }

    // No database to park in. Poll it out here instead — correct locally, and
    // the only alternative to abandoning a task that has already been charged.
    console.warn("[video] no shared cache; falling back to blocking poll");
    const result = await runTask(FEATURE, payload, units);
    const fixture = await writeFixture(
      {
        key,
        feature: FEATURE,
        inputs: identity,
        mediaType: "video",
        taskId: result.taskId,
        unitsSpent: result.unitsSpent,
        elapsedMs: result.elapsedMs,
        polls: result.polls,
        createdAt: new Date().toISOString(),
      },
      result.url,
    );

    return NextResponse.json({
      status: "success",
      source: "live",
      url: fixture.persisted ? fixture.imagePath : result.url,
      unitsSpent: result.unitsSpent,
      key,
      totalMs: Date.now() - startedAt,
    });
  } catch (err) {
    if (err instanceof PayloadError) {
      return bad(`${err.message} (no credits spent)`, err.code);
    }
    if (err instanceof PerfectCorpError) {
      console.error(`[video] ${err.code}: ${err.message}`);
      return bad(err.message, err.code, err.httpStatus === 401 ? 401 : 502);
    }
    console.error("[video] unexpected:", err);
    return bad("Unexpected server error", "Unexpected", 500);
  }
}

function bad(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}
