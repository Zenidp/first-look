import { explain, wasFree } from "./errors";
import type { Slot } from "./look-rules";

/**
 * Drives a look chain from the browser, one request per step.
 *
 * This lives outside the component on purpose. The chain is a sequence of
 * network calls with its own failure semantics, and keeping it out of render
 * means the orchestration can be reasoned about — and exercised — without a
 * React tree around it.
 *
 * Why the client drives it rather than /api/look/compose, which can run the
 * whole chain server-side: five sequential try-ons take 30–50 seconds, and a
 * single request that long has no progress to report and sits near the
 * platform's function duration limit. One request per step keeps each one short
 * and gives per-step progress for free.
 *
 * The important property is what happens on failure. A task that is accepted
 * and then fails is still billed (FINDINGS §3), so discarding the layers that
 * already succeeded would mean charging her twice for the same work. The chain
 * stops, keeps everything up to that point, and can be resumed from the last
 * good image.
 */

export type StepStatus = "idle" | "running" | "done" | "failed" | "skipped";

export type StepState = {
  slot: Slot;
  choice: { id: string; label: string; thumb?: string };
  status: StepStatus;
  imageUrl?: string;
  units: number;
  elapsedMs: number;
  error?: string;
  /** False only when the failure is known to have happened before task creation. */
  billed?: boolean;
};

export type ChainCallbacks = {
  /** Called on every state transition so the UI can render progress live. */
  onUpdate: (steps: StepState[]) => void;
  /** Called after each successful step with the image to build the next one on. */
  onProgress: (file: File, imageUrl: string) => void;
};

/** Pulls a produced image back as a File so it can seed the next step. */
async function asFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hasil langkah sebelumnya tidak bisa dibaca (${res.status}).`);
  return new File([await res.blob()], name, { type: "image/jpeg" });
}

/**
 * Runs `steps` starting at `from`, compositing each result onto the next.
 * Returns the steps as they finished, so the caller can tell success from a
 * stop without re-reading state it may not have committed yet.
 */
export async function runChain(
  steps: StepState[],
  from: number,
  seed: File,
  cb: ChainCallbacks,
): Promise<StepState[]> {
  const list = [...steps];
  let current = seed;

  for (let i = from; i < list.length; i++) {
    if (list[i].status === "skipped") continue;

    list[i] = { ...list[i], status: "running", error: undefined };
    cb.onUpdate([...list]);

    const started = Date.now();
    const slot = list[i].slot;

    try {
      const body = new FormData();
      body.append("photo", current);

      const options: Record<string, unknown> = { ...(slot.options ?? {}) };
      // The library items travel by id so the server reads the product photo off
      // disk; catalogue items travel as a template id in the options blob.
      if (slot.source === "reference") body.append("referenceId", list[i].choice.id);
      else options.templateId = list[i].choice.id;
      body.append("options", JSON.stringify(options));

      const res = await fetch(`/api/tryon/${slot.feature}`, { method: "POST", body });
      const data = await res.json();

      if (!res.ok || !data.imageUrl) {
        list[i] = {
          ...list[i],
          status: "failed",
          elapsedMs: Date.now() - started,
          error: explain(data.code, data.error),
          billed: !wasFree(data.code),
        };
        cb.onUpdate([...list]);
        return list;
      }

      current = await asFile(data.imageUrl, `${data.key}.jpg`);
      list[i] = {
        ...list[i],
        status: "done",
        imageUrl: data.imageUrl,
        units: data.unitsSpent ?? 0,
        elapsedMs: Date.now() - started,
      };
      cb.onUpdate([...list]);
      cb.onProgress(current, data.imageUrl);
    } catch (err) {
      // A thrown error never reached a created task, or we cannot tell that it
      // did — either way there is no task id to account for, so do not claim
      // units were spent.
      list[i] = {
        ...list[i],
        status: "failed",
        elapsedMs: Date.now() - started,
        error: err instanceof Error ? err.message : "Koneksi terputus.",
        billed: false,
      };
      cb.onUpdate([...list]);
      return list;
    }
  }

  return list;
}
