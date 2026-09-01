import {
  getFeature,
  videoUnits,
  type FeatureId,
  type VideoDuration,
  type VideoResolution,
} from "./features";
import { PerfectCorpError, runTask, uploadImage } from "./client";
import { buildPayload, cacheableOptions } from "./payload";
import {
  fixtureKey,
  forceLive,
  hashBytes,
  offline,
  readFixture,
  readFixtureMedia,
  writeFixture,
} from "./fixtures";

/**
 * One task, start to finish: cache lookup, upload, create, poll, mirror.
 *
 * This lives here rather than in the route handler because the look chain
 * (src/lib/look.ts) runs the same sequence five times in a row, feeding each
 * result into the next step. Two copies of this logic would mean two places to
 * get the billing guard wrong — and the guard is the whole point: a task that
 * is accepted and then fails is still charged (FINDINGS section 3), so the
 * cache is consulted, and the payload validated, before anything is uploaded.
 */

export class OfflineCacheMiss extends Error {
  readonly code = "OfflineCacheMiss";
  constructor(feature: FeatureId) {
    super(
      `PERFECTCORP_OFFLINE=1 and no fixture exists for these inputs to ${feature}. ` +
        "No credits were spent.",
    );
    this.name = "OfflineCacheMiss";
  }
}

export type RunPhoto = { bytes: Uint8Array; name: string };

export type RunInput = {
  feature: FeatureId;
  photos: RunPhoto[];
  reference?: RunPhoto;
  options: Record<string, unknown>;
};

export type RunOutcome = {
  feature: FeatureId;
  source: "fixture" | "live";
  key: string;
  /** Public /fixtures path, or the upstream URL when the mirror could not be written. */
  mediaUrl?: string;
  mediaType: "image" | "video" | "none";
  /** Result bytes, when we have them. Present on a live call and on a mirrored hit. */
  bytes?: Uint8Array;
  /** Diagnostics only. */
  data?: Record<string, unknown>;
  unitsSpent: number;
  unitsSavedByCache: number;
  elapsedMs: number;
  polls?: number;
  taskId?: string;
  persisted?: boolean;
};

/**
 * How many units this task will actually bill. Flat for every feature except
 * video, which charges per second of output at a rate set by the resolution
 * tier — 5 units for 480p/5s up to 30 for 1080p/10s.
 */
export function unitsFor(feature: FeatureId, options: Record<string, unknown>): number {
  const f = getFeature(feature);
  if (f.kind !== "video") return f.units;
  return videoUnits(
    (options.resolution as VideoResolution) ?? "480",
    (options.duration as VideoDuration) ?? 5,
  );
}

/**
 * Cache identity for a task. Photo order is folded in only for the multi-photo
 * diagnostics: fixtureKey sorts the hashes, which is right when photos are
 * interchangeable and wrong when the API reads them as front, right, left and
 * answers differently if swapped (FINDINGS section 2g).
 */
export function identityFor(input: RunInput): {
  identity: Record<string, unknown>;
  key: string;
} {
  const { feature, photos, reference, options } = input;
  const identity = cacheableOptions(feature, options);

  const imageHashes = photos.map((p) => hashBytes(p.bytes));
  if (reference) imageHashes.push(hashBytes(reference.bytes));

  if (photos.length > 1) {
    identity.__photoOrder = photos.map((p) => hashBytes(p.bytes)).join(",");
  }

  return { identity, key: fixtureKey(feature, identity, imageHashes) };
}

export async function runFeature(input: RunInput): Promise<RunOutcome> {
  const startedAt = Date.now();
  const { feature, photos, reference, options } = input;
  const f = getFeature(feature);
  const mediaType: RunOutcome["mediaType"] = f.returnsJson
    ? "none"
    : f.returnsVideo
      ? "video"
      : "image";

  // Validate the option set first, ahead of the cache and the offline gate. An
  // invalid request should report as invalid whatever the cache state is;
  // answering "offline cache miss" to a request that was missing `gender` sends
  // you chasing the wrong problem. buildPayload is pure, so a throwaway call
  // with placeholder ids costs nothing.
  buildPayload(feature, {
    srcFileIds: photos.map((_, i) => `pending-${i}`),
    refFileId: reference ? "pending-ref" : undefined,
    options,
  });

  const { identity, key } = identityFor(input);

  // --- cache first, before spending anything --------------------------------
  if (!forceLive()) {
    const cached = await readFixture(key);
    if (cached) {
      return {
        feature,
        source: "fixture",
        key,
        mediaUrl: cached.imagePath,
        mediaType,
        // Read the mirrored bytes back so a chained step can feed them onward
        // without a second call. Missing file is not fatal: the caller only
        // needs bytes when it is chaining.
        bytes: (await readFixtureMedia(cached)) ?? undefined,
        data: cached.data,
        unitsSpent: 0,
        unitsSavedByCache: cached.unitsSpent,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  if (offline()) throw new OfflineCacheMiss(feature);

  // --- live -----------------------------------------------------------------
  const srcFileIds: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    srcFileIds.push(await uploadImage(photos[i].bytes, photos[i].name || `photo-${i}.jpg`));
  }
  const refFileId = reference
    ? await uploadImage(reference.bytes, reference.name || "reference.jpg")
    : undefined;

  const payload = buildPayload(feature, { srcFileIds, refFileId, options });
  const result = await runTask(feature, payload, unitsFor(feature, options));

  const fixture = await writeFixture(
    {
      key,
      feature,
      inputs: identity,
      mediaType: mediaType === "none" ? undefined : mediaType,
      data: result.data,
      taskId: result.taskId,
      unitsSpent: result.unitsSpent,
      elapsedMs: result.elapsedMs,
      polls: result.polls,
      createdAt: new Date().toISOString(),
    },
    result.url,
  );

  return {
    feature,
    source: "live",
    key,
    // On a read-only filesystem (Vercel) nothing was mirrored locally, so point
    // at the upstream URL instead. It expires in 2 hours, which is fine for the
    // immediate response.
    mediaUrl: fixture.persisted ? fixture.imagePath : result.url,
    mediaType,
    bytes: fixture.bytes,
    data: result.data,
    unitsSpent: result.unitsSpent,
    unitsSavedByCache: 0,
    elapsedMs: result.elapsedMs,
    polls: result.polls,
    taskId: result.taskId,
    persisted: fixture.persisted,
  };
}

export { PerfectCorpError };
