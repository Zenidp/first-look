import { NextResponse } from "next/server";

import { PerfectCorpError, checkTask } from "@/lib/perfectcorp/client";
import { writeFixture } from "@/lib/perfectcorp/fixtures";
import { dropPendingTask, getPendingTask } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const FEATURE = "imageToVideo" as const;

/**
 * GET /api/video/<taskId> — read the outcome of a clip started earlier.
 *
 * One status read per call, no waiting, so this never approaches a function
 * duration limit however long the render takes. The client polls it.
 *
 * Polling is free, but abandoning a running task is not: the docs warn that an
 * unpolled task can expire and still be charged. So the client is expected to
 * keep asking until this returns something terminal.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/video/[taskId]">) {
  const { taskId } = await ctx.params;

  // The identity was parked at creation. Without it there is nothing to file a
  // result under, and no way to know what the task cost.
  const pending = await getPendingTask(taskId);
  if (!pending) {
    return NextResponse.json(
      {
        error:
          "That task is not being tracked. It may have already completed, or it was " +
          "started before the shared cache was available.",
        code: "UnknownTask",
      },
      { status: 404 },
    );
  }

  try {
    const check = await checkTask(FEATURE, taskId);

    if (check.status === "running") {
      return NextResponse.json({ status: "running", taskId });
    }

    const fixture = await writeFixture(
      {
        key: pending.key,
        feature: FEATURE,
        inputs: pending.inputs,
        mediaType: "video",
        taskId,
        unitsSpent: pending.units,
        // The render happened across several requests, so there is no single
        // elapsed time to report honestly. Zero is better than a fabricated one.
        elapsedMs: 0,
        polls: 0,
        createdAt: new Date().toISOString(),
      },
      check.url,
    );

    await dropPendingTask(taskId);

    return NextResponse.json({
      status: "success",
      source: "live",
      // The upstream URL expires in two hours; the mirror does not. Prefer it,
      // and fall back only when nothing could be persisted.
      url: fixture.persisted ? fixture.imagePath : check.url,
      unitsSpent: pending.units,
      key: pending.key,
    });
  } catch (err) {
    if (err instanceof PerfectCorpError) {
      // Terminal. Stop tracking it — but the units are gone either way, because
      // the task was created before it failed (FINDINGS §3).
      await dropPendingTask(taskId);
      return NextResponse.json(
        { error: err.message, code: err.code, unitsSpent: pending.units, billed: true },
        { status: err.httpStatus === 401 ? 401 : 502 },
      );
    }
    console.error(`[video/${taskId}] unexpected:`, err);
    return NextResponse.json({ error: "Unexpected server error", code: "Unexpected" }, { status: 500 });
  }
}
