import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { FeatureId } from "./features";
import {
  getFixture,
  putFixture,
  putMedia,
  storageUrl,
  supabaseEnabled,
} from "../supabase";

/**
 * Fixture cache (CONTEXT section 5).
 *
 * Credits are finite and the demo has to be reproducible on demand. Every
 * successful task is stored as JSON keyed by a hash of its inputs, and the
 * result image is downloaded to disk immediately — the Perfect Corp result URL
 * expires after 2 hours, so caching the URL alone would be worthless by demo
 * day.
 *
 *   fixtures/<key>.json          metadata, committed to git
 *   public/fixtures/<key>.jpg    the image, committed to git, served statically
 *   public/fixtures/<key>.mp4    …or the clip, for the video feature
 *
 * Both are committed on purpose: on Vercel the filesystem is read-only at
 * runtime, so cache WRITES only happen on your machine. Reads work everywhere.
 * That is the desired behaviour — the deployed demo replays fixtures and can
 * never surprise you with a credit bill or a cold-start timeout mid-judging.
 */

const FIXTURE_DIR = path.join(process.cwd(), "fixtures");
const IMAGE_DIR = path.join(process.cwd(), "public", "fixtures");

export type Fixture = {
  key: string;
  feature: FeatureId;
  /** Task inputs, with file_ids stripped — they are not reproducible. */
  inputs: Record<string, unknown>;
  /**
   * Try-ons: the mirrored result, served from /public. Diagnostics have none.
   * Named `imagePath` because 18 fixtures were written with that key before
   * video existed; it now also carries .mp4 paths. `mediaType` disambiguates.
   */
  imagePath?: string;
  /** Absent on every fixture written before the video feature — read as "image". */
  mediaType?: "image" | "video";
  /** Diagnostics: the attribute payload, stored verbatim. */
  data?: Record<string, unknown>;
  taskId: string;
  unitsSpent: number;
  elapsedMs: number;
  polls: number;
  createdAt: string;
};

/**
 * Key = feature + endpoint version + task parameters + a hash of every input
 * image's bytes. Uploading the same photo twice yields a different file_id, so
 * file_ids must be excluded or the cache would never hit.
 */
export function fixtureKey(
  feature: FeatureId,
  params: Record<string, unknown>,
  imageHashes: string[],
): string {
  const canonical = JSON.stringify({
    feature,
    params: Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b))),
    images: [...imageHashes].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

/**
 * Cache lookup, in the order that matters.
 *
 *   1. the fixtures committed to git — instant, guaranteed, and the demo path
 *   2. Supabase — the shared cache, and the only layer that can grow in
 *      production, where the filesystem is read-only
 *   3. nothing, so the caller goes live and pays
 *
 * Layer 1 comes first on purpose. Whatever happens to the database — down,
 * misconfigured, never set up — the demo still replays for zero units from
 * files that ship with the deployment.
 */
export async function readFixture(key: string): Promise<Fixture | null> {
  try {
    const raw = await readFile(path.join(FIXTURE_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as Fixture;
  } catch {
    // Not on disk. Fall through.
  }

  const row = await getFixture(key);
  if (!row) return null;

  const mediaType = row.media_type ?? undefined;
  return {
    key: row.key,
    feature: row.feature as FeatureId,
    inputs: row.inputs ?? {},
    mediaType,
    // A remote fixture is served straight from Supabase Storage rather than
    // from /public, so this is an absolute URL rather than a local path.
    imagePath: mediaType ? (storageUrl(row.key, mediaType) ?? undefined) : undefined,
    data: row.data ?? undefined,
    taskId: row.task_id ?? "",
    unitsSpent: row.units_spent,
    elapsedMs: row.elapsed_ms,
    polls: row.polls,
    createdAt: "",
  };
}

/**
 * Downloads the result and writes both files. Best-effort: on a read-only
 * filesystem the live result is still returned to the caller, the call just
 * does not get memoised.
 *
 * Returns the downloaded bytes when it has them, even if persisting failed.
 * The look chain feeds each step's output into the next step's input, and it
 * needs those exact bytes — refetching the result URL later is not an option,
 * it expires in 2 hours.
 */
export async function writeFixture(
  meta: Omit<Fixture, "imagePath">,
  resultUrl?: string,
): Promise<Fixture & { persisted: boolean; bytes?: Uint8Array }> {
  const ext = meta.mediaType === "video" ? "mp4" : "jpg";
  const fixture: Fixture = resultUrl
    ? { ...meta, imagePath: `/fixtures/${meta.key}.${ext}` }
    : { ...meta };

  let bytes: Uint8Array | undefined;

  try {
    // Download before touching the filesystem, so a read-only mount still
    // yields the bytes the caller needs to chain onwards.
    if (resultUrl) {
      const res = await fetch(resultUrl);
      if (!res.ok) throw new Error(`result download failed: ${res.status}`);
      bytes = new Uint8Array(await res.arrayBuffer());
    }

    await mkdir(FIXTURE_DIR, { recursive: true });
    if (bytes) {
      await mkdir(IMAGE_DIR, { recursive: true });
      await writeFile(path.join(IMAGE_DIR, `${meta.key}.${ext}`), bytes);
    }

    await writeFile(
      path.join(FIXTURE_DIR, `${meta.key}.json`),
      JSON.stringify(fixture, null, 2) + "\n",
    );
  } catch (err) {
    // Expected on Vercel, whose runtime filesystem is read-only. The local
    // `imagePath` must not be advertised in that case — nothing was written
    // there, and the browser would show a broken image. Supabase is the layer
    // that can actually persist here, so try it before giving up.
    console.warn(`[fixtures] could not persist ${meta.key} locally:`, err);

    const remote = await persistRemote(meta, bytes);
    return remote
      ? { ...fixture, imagePath: remote, persisted: true, bytes }
      : { ...fixture, imagePath: undefined, persisted: false, bytes };
  }

  // Written locally. Mirror to Supabase as well so other deployments — and
  // production, which cannot write at all — get the benefit of a result this
  // machine already paid for.
  void persistRemote(meta, bytes);

  return { ...fixture, persisted: true, bytes };
}

/**
 * Copies a result into the shared cache. Returns the public URL when the media
 * landed, so a read-only host can still serve what it just generated.
 *
 * Every failure is soft: a broken database must never turn a successful,
 * already-billed task into an error.
 */
async function persistRemote(
  meta: Omit<Fixture, "imagePath">,
  bytes?: Uint8Array,
): Promise<string | undefined> {
  if (!supabaseEnabled()) return undefined;

  let url: string | undefined;
  if (bytes && meta.mediaType) {
    const ok = await putMedia(meta.key, meta.mediaType, bytes);
    if (ok) url = storageUrl(meta.key, meta.mediaType) ?? undefined;
  }

  // The row goes in even when the upload failed: the units were spent either
  // way, and a row without media still records what that key cost.
  await putFixture({
    key: meta.key,
    feature: meta.feature,
    inputs: meta.inputs,
    media_type: meta.mediaType ?? null,
    data: meta.data ?? null,
    task_id: meta.taskId,
    units_spent: meta.unitsSpent,
    elapsed_ms: meta.elapsedMs,
    polls: meta.polls,
  });

  return url;
}

/**
 * Reads a mirrored result back as bytes, so one chain step can feed the next.
 *
 * Tries disk first and falls back to fetching it, because a fixture found in
 * Supabase has its media in object storage rather than in /public — and on
 * Vercel that is the only place it can be.
 */
export async function readFixtureMedia(fixture: Fixture): Promise<Uint8Array | null> {
  if (!fixture.imagePath) return null;
  const ext = fixture.mediaType === "video" ? "mp4" : "jpg";

  try {
    return new Uint8Array(await readFile(path.join(IMAGE_DIR, `${fixture.key}.${ext}`)));
  } catch {
    // Not on disk.
  }

  if (/^https?:\/\//.test(fixture.imagePath)) {
    try {
      const res = await fetch(fixture.imagePath, { cache: "no-store" });
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch {
      // Fall through: the caller treats a missing body as an unchainable hit.
    }
  }
  return null;
}

/** `PERFECTCORP_LIVE=1` forces a real call even when a fixture exists. */
export const forceLive = () => process.env.PERFECTCORP_LIVE === "1";

/** `PERFECTCORP_OFFLINE=1` forbids live calls entirely. Zero credits, guaranteed. */
export const offline = () => process.env.PERFECTCORP_OFFLINE === "1";
