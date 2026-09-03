"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import StudioHeader from "@/components/layout/studio-header";
import PhotoCropper from "@/components/PhotoCropper";
import StepPicker from "@/components/StepPicker";
import { runChain, type StepState } from "@/lib/run-chain";
import { explain } from "@/lib/errors";
import { LOOK_RECIPES, VIDEO_PROMPTS } from "@/lib/look";
import {
  OUTFIT_LIMITATION,
  SLOTS,
  checkSelection,
  isRunnable,
  type Selection,
} from "@/lib/look-rules";
import { GUIDES, SUBJECTS, subjectOf, type Framing, type Subject } from "@/lib/photo";

/**
 * The look builder.
 *
 * The bride picks her own makeup, hair, outfit and jewellery; the app stacks
 * them onto one photo and then animates the result.
 *
 * Three things shape how this is built, and all three come from the platform
 * billing a task the moment it is accepted — a failure after that point still
 * costs (FINDINGS §3):
 *
 *  - Impossible combinations are refused in the UI rather than discovered by
 *    paying for them. See src/lib/look-rules.ts.
 *  - The chain is orchestrated here, one request per step, rather than in a
 *    single server call. Each request stays short, progress is per-step, and a
 *    failure at step four does not throw away the three layers already paid for.
 *  - Nothing is uploaded until the photo has been validated locally, for free.
 *
 * /api/look/compose still runs the whole chain server-side; it is the scripted
 * path the smoke test and the demo fixtures use.
 */

type Photo = { file: File; url: string; demo: boolean };

type VideoState = { url?: string; error?: string; units?: number };

/**
 * Waits out a render that outlives the request that started it.
 *
 * Abandoning a running task is not free — the docs warn that an unpolled task
 * can expire and still be charged — so this keeps asking rather than giving up
 * early. Five minutes is generous against a measured 62 seconds, and the
 * interval matches the server's own 1.5s polling cadence.
 */
async function pollVideo(taskId: string): Promise<VideoState> {
  const deadline = Date.now() + 300_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    let res: Response;
    try {
      res = await fetch(`/api/video/${encodeURIComponent(taskId)}`);
    } catch {
      continue; // A dropped poll is not a failed render. Ask again.
    }

    const data = await res.json();
    if (!res.ok) return { error: explain(data.code, data.error) };
    if (data.status === "success") return { url: data.url, units: data.unitsSpent };
  }

  return {
    error:
      "The video has not finished after five minutes. The units are already spent — " +
      "try again later and the result will appear immediately if it is ready.",
  };
}

const DETAILS = [
  { feature: "ring", label: "Ring", photo: "/demo/hand-ring.jpg", referenceId: "ring-gold-solitaire" },
  { feature: "bracelet", label: "Bracelet", photo: "/demo/hand-bracelet.jpg", referenceId: "bracelet-gold-cuff" },
];

/** Demo photo + preselected slots per framing, derived from the recipes so
 *  there is one source of truth for the zero-unit path. */
/**
 * What each clip can and cannot be trusted for. Keyed by framing so a new one
 * cannot inherit a caption written about a different photograph.
 */
const VIDEO_CAVEAT: Record<Framing, string> = {
  beauty:
    "This clip captures the mood, not the product detail — fine jewellery can shift shape once it is animated.",
  outfit:
    "Watch how the fabric falls, not the face: at full-body distance the face is re-synthesised by the model and drifts. The camera also pushes in on its own and sometimes crops the shoes, so the still remains the record of hem length.",
  groom:
    "This clip captures the mood, not the product detail — the beard and the velvet texture can shift slightly once animated.",
  groomOutfit:
    "Watch how the beskap and the kain fall, not the face: at full-body distance the face is re-synthesised by the model and drifts. The camera also pushes in on its own, so the still remains the record of the hem.",
};

const DEMO: Record<Framing, (typeof LOOK_RECIPES)[number]> = {
  beauty: LOOK_RECIPES.find((r) => r.id === "jawa-klasik")!,
  outfit: LOOK_RECIPES.find((r) => r.id === "jawa-klasik-outfit")!,
  groom: LOOK_RECIPES.find((r) => r.id === "jawa-groom")!,
  groomOutfit: LOOK_RECIPES.find((r) => r.id === "jawa-groom-outfit")!,
};

/**
 * Maps the recipe onto the builder's slots by feature. Keyed off the slot list
 * rather than assuming a slot id equals its feature name — they happen to match
 * today, and a look that used one feature twice would break the assumption
 * silently, by pre-selecting nothing.
 */
function demoSelection(framing: Framing): Selection {
  const out: Selection = {};
  for (const step of DEMO[framing].steps) {
    const slot = SLOTS[framing].find((s) => s.feature === step.feature);
    const id = (step.options?.templateId as string) ?? step.referenceId ?? "";
    if (slot && id) out[slot.id] = { id, label: step.label };
  }
  return out;
}

export default function LookPage() {
  const [framing, setFraming] = useState<Framing>("beauty");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [units, setUnits] = useState<Record<string, number>>({});

  const [steps, setSteps] = useState<StepState[]>([]);
  const [running, setRunning] = useState(false);
  const [finalUrl, setFinalUrl] = useState("");

  const [video, setVideo] = useState<VideoState | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});

  // The last successful image in the chain, as bytes. Retrying or skipping a
  // failed step continues from here rather than starting over and paying twice.
  const lastGood = useRef<File | null>(null);
  const urls = useRef<string[]>([]);

  const slots = SLOTS[framing];

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d: { features?: { id: string; units: number }[] }) =>
        setUnits(Object.fromEntries((d.features ?? []).map((f) => [f.id, f.units]))),
      )
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      for (const u of urls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  const reset = useCallback(() => {
    setSteps([]);
    setFinalUrl("");
    setVideo(null);
    lastGood.current = null;
  }, []);

  function switchFraming(next: Framing) {
    setFraming(next);
    setSelection({});
    setPhoto(null);
    reset();
  }

  /** Switching who is being dressed lands on that subject's waist-up framing,
   *  which is the one that carries a whole look. */
  function switchSubject(next: Subject) {
    switchFraming(SUBJECTS[next].framings[0]);
  }

  const subject = subjectOf(framing);

  async function loadDemo() {
    const recipe = DEMO[framing];
    const blob = await (await fetch(`/demo/${recipe.photo}`)).blob();
    setPhoto({
      file: new File([blob], recipe.photo, { type: "image/jpeg" }),
      url: `/demo/${recipe.photo}`,
      demo: true,
    });
    setSelection(demoSelection(framing));
    reset();
  }

  const issues = checkSelection(framing, selection);
  const chosen = slots.filter((s) => selection[s.id]);
  const estimate =
    chosen.reduce((sum, s) => sum + (units[s.feature] ?? 0), 0) + (photo?.demo ? 0 : 0);
  const canRun = !!photo && isRunnable(framing, selection) && !running;

  // --- running the chain ------------------------------------------------------

  const drive = useCallback(
    async (list: StepState[], from: number, seed: File) => {
      setRunning(true);
      await runChain(list, from, seed, {
        onUpdate: (next) => setSteps(next),
        onProgress: (file, imageUrl) => {
          // Remember the last good image: retrying or skipping a failed step
          // continues from here rather than paying for the whole chain again.
          lastGood.current = file;
          setFinalUrl(imageUrl);
        },
      });
      setRunning(false);
    },
    [],
  );

  async function start() {
    if (!photo) return;
    reset();
    const list: StepState[] = chosen.map((slot) => ({
      slot,
      choice: selection[slot.id]!,
      status: "idle",
      units: 0,
      elapsedMs: 0,
    }));
    setSteps(list);
    lastGood.current = photo.file;
    await drive(list, 0, photo.file);
  }

  function retryFrom(index: number, skip: boolean) {
    const list = [...steps];
    list[index] = skip
      ? { ...list[index], status: "skipped", error: undefined }
      : { ...list[index], status: "idle", error: undefined };
    setSteps(list);
    const seed = lastGood.current ?? photo?.file;
    if (seed) void drive(list, index, seed);
  }

  async function makeVideo() {
    if (!finalUrl) return;
    setVideoBusy(true);
    setVideo(null);
    try {
      const blob = await (await fetch(finalUrl)).blob();
      const body = new FormData();
      body.append("photo", new File([blob], "look.jpg", { type: "image/jpeg" }));
      body.append(
        "options",
        JSON.stringify({
          resolution: "480",
          duration: 5,
          // Keyed by framing rather than chosen with a ternary. The ternary
          // this replaces sent "the bride…the lace kebaya" to both groom
          // framings and billed two clips before anyone watched one.
          prompt: VIDEO_PROMPTS[framing].prompt,
          negativePrompt: VIDEO_PROMPTS[framing].negativePrompt,
        }),
      );
      const res = await fetch("/api/video", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setVideo({ error: explain(data.code, data.error) });
        return;
      }

      // A cache hit, or a deployment with nowhere to park the task, answers
      // immediately. Otherwise the render outlives the request and is polled.
      if (data.status === "success") {
        setVideo({ url: data.url, units: data.unitsSpent });
        return;
      }

      setVideo(await pollVideo(data.taskId));
    } catch (err) {
      setVideo({ error: err instanceof Error ? err.message : "Could not create the video." });
    } finally {
      setVideoBusy(false);
    }
  }

  async function runDetail(d: (typeof DETAILS)[number]) {
    const blob = await (await fetch(d.photo)).blob();
    const body = new FormData();
    body.append("photo", new File([blob], `${d.feature}.jpg`, { type: "image/jpeg" }));
    body.append("referenceId", d.referenceId);
    const res = await fetch(`/api/tryon/${d.feature}`, { method: "POST", body });
    const json = await res.json();
    if (json.imageUrl) setDetails((p) => ({ ...p, [d.feature]: json.imageUrl }));
  }

  const spent = steps.reduce((s, x) => s + x.units, 0);
  const failedAt = steps.findIndex((s) => s.status === "failed");

  // --- render -----------------------------------------------------------------

  if (cropping) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <PhotoCropper
          file={cropping}
          framing={framing}
          onCancel={() => setCropping(null)}
          onDone={(file, url) => {
            urls.current.push(url);
            setPhoto({ file, url, demo: false });
            setCropping(null);
            reset();
          }}
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <StudioHeader eyebrow="Look builder" title="Build the look">
        Choose the makeup, hair, garment and jewellery. Every choice stacks onto the
        same photograph — so the result is one real picture, not a collage — and it
        can then be animated into a short clip.
      </StudioHeader>

      {/* --- subject ------------------------------------------------------- */}
      <fieldset className="mb-4">
        <legend className="sr-only">Siapa yang disusun look-nya</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SUBJECTS) as Subject[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={subject === s}
              onClick={() => switchSubject(s)}
              className={`rounded-control border px-3 py-2.5 text-left transition-colors ${
                subject === s
                  ? "border-accent bg-accent-tint"
                  : "border-line-strong hover:bg-surface"
              }`}
            >
              <span className="block text-sm font-medium text-ink">
                {SUBJECTS[s].label}
              </span>
              <span className="block text-[11px] leading-4 text-ink-faint">
                {SUBJECTS[s].blurb}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* --- framing ------------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        {SUBJECTS[subject].framings.map((f) => (
          <button
            key={f}
            onClick={() => switchFraming(f)}
            className={`rounded-lg border px-3 py-2.5 text-left ${
              framing === f ? "border-accent bg-accent-tint" : "border-line-strong hover:bg-surface"
            }`}
          >
            <span className="block text-sm font-medium text-ink">{GUIDES[f].label}</span>
            <span className="block text-[11px] leading-4 text-ink-faint">
              {f === "beauty"
                ? "Makeup, hair, jewellery"
                : f === "groom"
                  ? "Beard, hair, garment"
                  : "Garment only"}
            </span>
          </button>
        ))}
      </div>

      {(framing === "outfit" || framing === "groomOutfit") && (
        <p className="mb-6 rounded-lg border border-line bg-surface p-3 text-xs leading-5 text-ink-soft">
          {OUTFIT_LIMITATION}
        </p>
      )}

      {/* --- photo --------------------------------------------------------- */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-ink">1. Photo</h2>
        <div className="mt-2 flex items-start gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt="The uploaded photo"
              className="w-24 shrink-0 rounded-lg border border-line object-cover"
            />
          ) : (
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong text-[11px] text-ink-faint">
              none yet
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-5 text-ink-faint">{GUIDES[framing].hint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface">
                {photo ? "Replace photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCropping(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => void loadDemo()}
                className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"
              >
                Use the sample
              </button>
            </div>
            {photo?.demo && (
              <p className="mt-1.5 text-[11px] text-ready">
                Sample photo — this look is already cached, so it costs 0 units.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* --- slots --------------------------------------------------------- */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-ink">2. Choices</h2>
        <div className="mt-1">
          {slots.map((slot) => (
            <StepPicker
              key={slot.id}
              slot={slot}
              subject={subject}
              value={selection[slot.id]}
              warning={issues.find((i) => i.slot === slot.id)?.message}
              onChange={(c) => {
                setSelection((prev) => ({ ...prev, [slot.id]: c }));
                reset();
              }}
            />
          ))}
        </div>
      </section>

      {/* --- run ----------------------------------------------------------- */}
      <button
        onClick={() => void start()}
        disabled={!canRun}
        className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-40"
      >
        {running
          ? "Building…"
          : !photo
            ? "Choose a photo first"
            : chosen.length === 0
              ? "Choose at least one"
              : `Build the look — about ${estimate} units`}
      </button>
      {photo && !photo.demo && chosen.length > 0 && !running && (
        <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">
          Your own photo has never been processed, so every step is a paid call.
          Around {chosen.length * 8} seconds.
        </p>
      )}

      {/* --- progress ------------------------------------------------------ */}
      {steps.length > 0 && (
        <section className="mt-6">
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li
                key={s.slot.id}
                className={`rounded-lg border p-3 ${
                  s.status === "failed" ? "border-late/30 bg-late-tint" : "border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {i + 1}. {s.slot.label}
                      <span className="ml-2 font-normal text-ink-faint">{s.choice.label}</span>
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {s.status === "running" && "running…"}
                      {s.status === "idle" && "waiting"}
                      {s.status === "skipped" && "skipped"}
                      {s.status === "done" &&
                        (s.units === 0
                          ? `from cache · 0 units · ${(s.elapsedMs / 1000).toFixed(1)}s`
                          : `${s.units} units · ${(s.elapsedMs / 1000).toFixed(1)}s`)}
                      {s.status === "failed" && "failed"}
                    </p>
                  </div>
                </div>

                {s.status === "failed" && (
                  <div className="mt-2">
                    <p className="text-xs leading-5 text-late">{s.error}</p>
                    <p className="mt-1 text-[11px] text-accent">
                      {s.billed
                        ? "This step was still billed — the task was created before it failed."
                        : "Refused before a task was created, so nothing was spent."}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => retryFrom(i, false)}
                        disabled={running}
                        className="rounded-md border border-late/40 px-3 py-1.5 text-xs font-medium text-late disabled:opacity-40"
                      >
                        Retry this step
                      </button>
                      <button
                        onClick={() => retryFrom(i, true)}
                        disabled={running}
                        className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft disabled:opacity-40"
                      >
                        Skip it, carry on
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-ink-faint">
            {spent === 0 ? "0 units so far." : `${spent} units spent so far.`}
            {failedAt >= 0 && " The layers already finished are kept."}
          </p>
        </section>
      )}

      {/* --- result -------------------------------------------------------- */}
      {finalUrl && !running && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-ink">
            {failedAt >= 0 ? "So far" : "The whole look"}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalUrl}
            alt="Look"
            className="mt-2 w-full rounded-xl border border-line"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={finalUrl}
              download="first-look.jpg"
              className="rounded-md border border-line-strong px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface"
            >
              Download photo
            </a>
            <button
              onClick={() => void makeVideo()}
              disabled={videoBusy}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-paper disabled:opacity-40"
            >
              {videoBusy ? "Creating video…" : "Animate it — 5 units"}
            </button>
          </div>
          {videoBusy && (
            <p className="mt-2 text-xs text-ink-faint">
              Generative video is far slower than a try-on: about a minute for a
              five-second clip.
            </p>
          )}
        </section>
      )}

      {video?.error && (
        <p className="mt-4 rounded-lg border border-late/30 bg-late-tint p-3 text-sm text-late">
          {video.error}
        </p>
      )}
      {video?.url && (
        <section className="mt-6">
          <video
            src={video.url}
            className="w-full rounded-xl border border-line"
            controls
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={video.url}
              download="first-look.mp4"
              className="rounded-md border border-line-strong px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface"
            >
              Download video
            </a>
            <span className="text-xs text-ink-faint">
              {video.units === 0 ? "From cache — 0 units." : `${video.units} units.`}
            </span>
          </div>
          {/* Keyed by framing for the same reason as the prompt above: a
              two-way ternary silently gave both groom framings the wrong
              caption once there were four. */}
          <p className="mt-2 text-xs leading-5 text-ink-faint">{VIDEO_CAVEAT[framing]}</p>
        </section>
      )}

      {/* --- details ------------------------------------------------------- */}
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-sm font-medium text-ink">Hand details</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          A ring and a bracelet cannot join the same photograph — both are macro shots of
          a hand, and no try-on composites one picture into another. They stand as separate
          tiles, which is how a bridal moodboard is laid out anyway.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {DETAILS.map((d) => (
            <div key={d.feature}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={details[d.feature] ?? d.photo}
                alt={d.label}
                className="w-full rounded-lg border border-line"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink">{d.label}</span>
                {details[d.feature] ? (
                  <a
                    href={details[d.feature]}
                    download={`first-look-${d.feature}.jpg`}
                    className="text-[11px] font-medium text-accent"
                  >
                    Download
                  </a>
                ) : (
                  <button
                    onClick={() => void runDetail(d)}
                    className="text-[11px] font-medium text-accent"
                  >
                    Try it
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
