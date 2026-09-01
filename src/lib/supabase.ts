/**
 * Minimal Supabase client: a shared fixture cache that survives production.
 *
 * WHY THIS EXISTS. Vercel's runtime filesystem is read-only, so `writeFixture`
 * always fails there. The deployed app can read the fixtures committed to git,
 * but it can never add one — which means every look a real bride builds is
 * billed again, in full, every single time she or anyone else builds it. That
 * is the largest credit leak in the project and it cannot be fixed on disk.
 *
 * WHY NO DEPENDENCY. This project has zero runtime dependencies and the value
 * of that is real: nothing to audit, nothing to break on install, a tiny bundle.
 * Supabase's PostgREST and Storage endpoints are plain HTTP with two headers,
 * so a client is about eighty lines. @supabase/supabase-js would add a hundred
 * kilobytes to save them.
 *
 * WHY IT IS OPTIONAL. Everything degrades to exactly today's behaviour when the
 * environment variables are absent: local fixtures still replay, live calls
 * still work, nothing throws. A missing database must never be the reason a
 * demo fails, so every function here fails soft and says so in the log.
 *
 * This module is server-only. The service role key bypasses row-level security
 * and must never reach the browser — same rule as PERFECTCORP_API_KEY.
 */

const BUCKET = "fixtures";

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** True when a shared cache is available. Used to report mode, not to gate logic. */
export function supabaseEnabled(): boolean {
  return config() !== null;
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export type RemoteFixture = {
  key: string;
  feature: string;
  inputs: Record<string, unknown>;
  media_type: "image" | "video" | null;
  data: Record<string, unknown> | null;
  task_id: string | null;
  units_spent: number;
  elapsed_ms: number;
  polls: number;
};

/** The public URL a mirrored result is served from. */
export function storageUrl(key: string, mediaType: "image" | "video"): string | null {
  const cfg = config();
  if (!cfg) return null;
  return `${cfg.url}/storage/v1/object/public/${BUCKET}/${key}.${mediaType === "video" ? "mp4" : "jpg"}`;
}

export async function getFixture(key: string): Promise<RemoteFixture | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/fixtures?key=eq.${encodeURIComponent(key)}&select=*&limit=1`,
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = (await res.json()) as RemoteFixture[];
    return rows[0] ?? null;
  } catch (err) {
    // A cache that is down must not take the request with it: fall through to
    // a live call rather than failing.
    console.warn("[supabase] fixture lookup failed:", err);
    return null;
  }
}

export async function putFixture(row: RemoteFixture): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/fixtures?on_conflict=key`, {
      method: "POST",
      headers: headers(cfg.key, {
        "Content-Type": "application/json",
        // Two requests can race on the same key; the second should win quietly
        // rather than 409 and lose a result that has already been paid for.
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return true;
  } catch (err) {
    console.warn("[supabase] fixture write failed:", err);
    return false;
  }
}

export async function putMedia(
  key: string,
  mediaType: "image" | "video",
  bytes: Uint8Array,
): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  const name = `${key}.${mediaType === "video" ? "mp4" : "jpg"}`;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      headers: headers(cfg.key, {
        "Content-Type": mediaType === "video" ? "video/mp4" : "image/jpeg",
        // The key is a content hash, so an existing object is the same object.
        "x-upsert": "true",
      }),
      body: bytes as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return true;
  } catch (err) {
    console.warn("[supabase] media upload failed:", err);
    return false;
  }
}

// --- pending tasks ----------------------------------------------------------

export type PendingTask = {
  task_id: string;
  key: string;
  feature: string;
  inputs: Record<string, unknown>;
  media_type: "image" | "video" | null;
  units: number;
};

/**
 * Parks the identity of a task that will outlive this request.
 *
 * Video takes ~62s for a 5-second clip against a function budget that may be
 * 60, so it is created in one request and polled in another. The cache key and
 * the real unit cost are computed at creation and stored here rather than
 * handed to the client, so a caller cannot file a result under someone else's
 * key or under-report what it cost.
 *
 * Returns false when there is no database, which is the caller's signal to fall
 * back to creating and polling inside one request.
 */
export async function putPendingTask(task: PendingTask): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/pending_tasks?on_conflict=task_id`, {
      method: "POST",
      headers: headers(cfg.key, {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return true;
  } catch (err) {
    console.warn("[supabase] pending task write failed:", err);
    return false;
  }
}

export async function getPendingTask(taskId: string): Promise<PendingTask | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/pending_tasks?task_id=eq.${encodeURIComponent(taskId)}&select=*&limit=1`,
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as PendingTask[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Called once a task reaches a terminal state, success or failure. */
export async function dropPendingTask(taskId: string): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/pending_tasks?task_id=eq.${encodeURIComponent(taskId)}`, {
      method: "DELETE",
      headers: headers(cfg.key),
    });
  } catch {
    // A stray row is swept by age; losing this delete costs nothing.
  }
}

// --- usage ledger -----------------------------------------------------------

/**
 * Units spent by one session, so a single visitor cannot drain the balance.
 *
 * Counted server-side against a caller-supplied session id. That is trivially
 * forgeable, and deliberately so — this is a guard against an enthusiastic user
 * with a slow connection retrying twenty times, not a security boundary. Real
 * abuse prevention needs auth, which CONTEXT §7 rules out.
 */
export async function addUsage(session: string, units: number): Promise<void> {
  const cfg = config();
  if (!cfg || units <= 0) return;
  try {
    await fetch(`${cfg.url}/rest/v1/rpc/add_usage`, {
      method: "POST",
      headers: headers(cfg.key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ p_session: session, p_units: units }),
    });
  } catch (err) {
    console.warn("[supabase] usage write failed:", err);
  }
}

export async function usageFor(session: string): Promise<number> {
  const cfg = config();
  if (!cfg) return 0;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/usage?session=eq.${encodeURIComponent(session)}&select=units`,
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { units: number }[];
    return rows[0]?.units ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Ceiling for one session. Generous enough for a bride to build several looks
 * with a video each, tight enough that a runaway loop is capped.
 */
export const SESSION_UNIT_CAP = Number(process.env.SESSION_UNIT_CAP ?? 120);
