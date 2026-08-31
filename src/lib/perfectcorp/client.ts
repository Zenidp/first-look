import { FEATURES, type FeatureId } from "./features";

/**
 * Server-side Perfect Corp (YouCam) API client.
 *
 * Auth is a static API key sent as a Bearer token. There is no token exchange,
 * no expiry, no refresh. The "secret key" the console shows you is an RSA
 * public key belonging to the older /s2s/v1.0/client/auth flow and is not used
 * by any v2.x endpoint.
 *
 * This module must never be imported from a client component: it would leak
 * the key into the browser bundle. Import it only from files under app/api/.
 * (`npm i server-only` + `import "server-only"` would turn that into a build
 * error rather than a convention — deliberately skipped to keep deps at zero.)
 */

const DEFAULT_BASE = "https://yce-api-01.makeupar.com";

/** Docs suggest ~5 QPS; hard limit is 250 requests / 300s per key AND per IP. */
export const POLL_INTERVAL_MS = 1500;
export const POLL_TIMEOUT_MS = 90_000;

export class PerfectCorpError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "PerfectCorpError";
  }
}

function apiKey(): string {
  const key = process.env.PERFECTCORP_API_KEY?.trim();
  if (!key) {
    throw new PerfectCorpError(
      "PERFECTCORP_API_KEY is not set. Locally: add it to .env.local and restart. " +
        "On Vercel: Project Settings > Environment Variables, then redeploy.",
      "MissingApiKey",
    );
  }
  return key;
}

function base(): string {
  return (process.env.PERFECTCORP_API_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new PerfectCorpError(
      `Non-JSON response from ${path}: ${text.slice(0, 200)}`,
      "BadResponse",
      res.status,
    );
  }

  if (!res.ok) {
    const b = body as { error?: string; error_code?: string };
    throw new PerfectCorpError(
      b.error ?? `Request to ${path} failed`,
      b.error_code ?? String(res.status),
      res.status,
    );
  }
  return body as T;
}

// --- file upload -----------------------------------------------------------

type FileApiResponse = {
  status: number;
  data: {
    files: Array<{
      file_id: string;
      requests: Array<{
        method: string;
        url: string;
        headers: Record<string, string>;
      }>;
    }>;
  };
};

/**
 * Two-step upload: ask the File API for a presigned slot, then PUT the bytes
 * straight to S3. The PUT carries no Authorization header — the signature is
 * already in the URL, and `file_size` must match the byte length exactly or
 * the signature will not validate.
 *
 * Costs 0 units.
 */
export async function uploadImage(
  bytes: Uint8Array,
  fileName: string,
  contentType = "image/jpeg",
): Promise<string> {
  const body = await call<FileApiResponse>("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }],
    }),
  });

  const file = body.data?.files?.[0];
  const upload = file?.requests?.[0];
  if (!file?.file_id || !upload?.url) {
    throw new PerfectCorpError("File API returned no upload slot", "NoUploadSlot");
  }

  const put = await fetch(upload.url, {
    method: upload.method || "PUT",
    headers: upload.headers,
    // Uint8Array is a valid BodyInit; cast keeps TS happy across lib targets.
    body: bytes as unknown as BodyInit,
  });
  if (!put.ok) {
    throw new PerfectCorpError(
      `Presigned upload failed: ${put.status} ${await put.text().catch(() => "")}`.trim(),
      "UploadFailed",
      put.status,
    );
  }

  return file.file_id;
}

// --- tasks -----------------------------------------------------------------

type RunTaskResponse = { status: number; data: { task_id: string } };

type ResultBag = Record<string, unknown> & { url?: string; download_url?: string };

type TaskStatusResponse = {
  status: number;
  data: {
    task_status: "running" | "queued" | "processing" | "success" | "error";
    error?: string | null;
    error_message?: string | null;
    // Try-ons return an image URL; diagnostics return attribute objects.
    // Some endpoints wrap the payload in an array. Handle every combination.
    results?: ResultBag | ResultBag[];
  };
};

function firstResult(results: TaskStatusResponse["data"]["results"]): ResultBag | undefined {
  return Array.isArray(results) ? results[0] : results;
}

function resultUrl(results: TaskStatusResponse["data"]["results"]): string | undefined {
  const first = firstResult(results);
  return first?.url ?? first?.download_url;
}

/** THIS is the call that burns units. */
export async function createTask(
  feature: FeatureId,
  payload: Record<string, unknown>,
): Promise<string> {
  const f = FEATURES[feature];
  const body = await call<RunTaskResponse>(`/s2s/${f.version}/task/${f.task}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!body.data?.task_id) {
    throw new PerfectCorpError("Task created but no task_id returned", "NoTaskId");
  }
  return body.data.task_id;
}

export type PollResult = {
  /** Present for try-ons. Absent for diagnostics, which return data instead. */
  url?: string;
  /** Raw results payload — the attribute object for diagnostics. */
  data?: Record<string, unknown>;
  elapsedMs: number;
  polls: number;
};

/**
 * Poll until success or error. Polling is free, but abandoning a running task
 * is not: the docs warn that an unpolled task can expire and still be charged.
 * So we always poll to a terminal state rather than bailing early.
 */
export async function pollTask(feature: FeatureId, taskId: string): Promise<PollResult> {
  const f = FEATURES[feature];
  const startedAt = Date.now();
  let polls = 0;

  for (;;) {
    const body = await call<TaskStatusResponse>(`/s2s/${f.version}/task/${f.task}/${taskId}`);
    polls += 1;
    const { task_status, error, error_message } = body.data;

    if (task_status === "success") {
      const url = resultUrl(body.data.results);
      // Diagnostics legitimately have no URL, so only try-ons may complain.
      if (!url && !f.returnsJson) {
        throw new PerfectCorpError("Task succeeded but no result URL", "NoResultUrl");
      }
      // Only diagnostics carry a meaningful payload. For try-ons the bag holds
      // nothing but the URL, and storing it would bloat every fixture with a
      // signed link that dies in two hours anyway.
      const data = f.returnsJson ? firstResult(body.data.results) : undefined;
      return { url, data, elapsedMs: Date.now() - startedAt, polls };
    }

    if (task_status === "error") {
      throw new PerfectCorpError(
        error_message || error || "AI task failed",
        error || "TaskError",
      );
    }

    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new PerfectCorpError(
        `Task ${taskId} still ${task_status} after ${POLL_TIMEOUT_MS / 1000}s`,
        "PollTimeout",
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export async function runTask(
  feature: FeatureId,
  payload: Record<string, unknown>,
): Promise<PollResult & { taskId: string; unitsSpent: number }> {
  const taskId = await createTask(feature, payload);
  const result = await pollTask(feature, taskId);
  return { ...result, taskId, unitsSpent: FEATURES[feature].units };
}

/** Free. Used to populate the style picker. */
export async function listTemplates(feature: FeatureId, pageSize = 20, startingToken?: string) {
  const f = FEATURES[feature];
  if (!f.templates) throw new PerfectCorpError(`${feature} has no template API`, "NoTemplates");

  const qs = new URLSearchParams({ page_size: String(pageSize) });
  if (startingToken) qs.set("starting_token", startingToken);

  return call<{
    status: number;
    data: {
      templates: Array<{
        id: string;
        thumb: string;
        title: string;
        category_name: string;
        keep_users_color?: boolean;
      }>;
      next_token?: string;
    };
  }>(`/s2s/${f.templates.version}/task/${f.templates.path}?${qs}`);
}
