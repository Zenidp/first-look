"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import PhotoCropper from "@/components/PhotoCropper";
import StepPicker from "@/components/StepPicker";
import { runChain, type StepState } from "@/lib/run-chain";
import { explain } from "@/lib/errors";
import {
  BEAUTY_VIDEO_NEGATIVE,
  BEAUTY_VIDEO_PROMPT,
  LOOK_RECIPES,
  OUTFIT_VIDEO_NEGATIVE,
  OUTFIT_VIDEO_PROMPT,
} from "@/lib/look";
import {
  OUTFIT_LIMITATION,
  SLOTS,
  checkSelection,
  isRunnable,
  type Selection,
} from "@/lib/look-rules";
import { GUIDES, type Framing } from "@/lib/photo";

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
      "Videonya belum selesai setelah lima menit. Unitnya sudah terpakai — " +
      "coba lagi nanti, hasilnya akan langsung muncul kalau sudah jadi.",
  };
}

const DETAILS = [
  { feature: "ring", label: "Cincin", photo: "/demo/hand-ring.jpg", referenceId: "ring-gold-solitaire" },
  { feature: "bracelet", label: "Gelang", photo: "/demo/hand-bracelet.jpg", referenceId: "bracelet-gold-cuff" },
];

/** Demo photo + preselected slots per framing, derived from the recipes so
 *  there is one source of truth for the zero-unit path. */
const DEMO = {
  beauty: LOOK_RECIPES.find((r) => r.id === "jawa-klasik")!,
  outfit: LOOK_RECIPES.find((r) => r.id === "jawa-klasik-outfit")!,
} as const;

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
          prompt: framing === "beauty" ? BEAUTY_VIDEO_PROMPT : OUTFIT_VIDEO_PROMPT,
          negativePrompt: framing === "beauty" ? BEAUTY_VIDEO_NEGATIVE : OUTFIT_VIDEO_NEGATIVE,
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
      setVideo({ error: err instanceof Error ? err.message : "Gagal membuat video." });
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
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-rose-700">First Look</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Susun look-nya
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Pilih makeup, rambut, busana dan perhiasannya. Semuanya ditumpuk ke satu foto
          yang sama — jadi satu foto asli, bukan kolase — lalu bisa digerakkan jadi video.
        </p>
      </header>

      {/* --- framing ------------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        {(["beauty", "outfit"] as Framing[]).map((f) => (
          <button
            key={f}
            onClick={() => switchFraming(f)}
            className={`rounded-lg border px-3 py-2.5 text-left ${
              framing === f ? "border-rose-700 bg-rose-50" : "border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <span className="block text-sm font-medium text-zinc-900">{GUIDES[f].label}</span>
            <span className="block text-[11px] leading-4 text-zinc-500">
              {f === "beauty" ? "Makeup, rambut, perhiasan" : "Busana saja"}
            </span>
          </button>
        ))}
      </div>

      {framing === "outfit" && (
        <p className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
          {OUTFIT_LIMITATION}
        </p>
      )}

      {/* --- photo --------------------------------------------------------- */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-zinc-900">1. Foto</h2>
        <div className="mt-2 flex items-start gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt="Foto pengantin"
              className="w-24 shrink-0 rounded-lg border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-[11px] text-zinc-400">
              belum ada
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-5 text-zinc-500">{GUIDES[framing].hint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                {photo ? "Ganti foto" : "Unggah foto"}
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
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Pakai contoh
              </button>
            </div>
            {photo?.demo && (
              <p className="mt-1.5 text-[11px] text-emerald-700">
                Foto contoh — look ini sudah tersimpan, jadi 0 unit.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* --- slots --------------------------------------------------------- */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-zinc-900">2. Pilihan</h2>
        <div className="mt-1">
          {slots.map((slot) => (
            <StepPicker
              key={slot.id}
              slot={slot}
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
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {running
          ? "Menyusun…"
          : !photo
            ? "Pilih foto dulu"
            : chosen.length === 0
              ? "Pilih minimal satu"
              : `Susun look — perkiraan ${estimate} unit`}
      </button>
      {photo && !photo.demo && chosen.length > 0 && !running && (
        <p className="mt-2 text-center text-[11px] leading-4 text-zinc-500">
          Foto sendiri belum pernah diproses, jadi setiap langkah adalah panggilan
          berbayar. Sekitar {chosen.length * 8} detik.
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
                  s.status === "failed" ? "border-rose-200 bg-rose-50" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-zinc-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {i + 1}. {s.slot.label}
                      <span className="ml-2 font-normal text-zinc-500">{s.choice.label}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {s.status === "running" && "sedang diproses…"}
                      {s.status === "idle" && "menunggu"}
                      {s.status === "skipped" && "dilewati"}
                      {s.status === "done" &&
                        (s.units === 0
                          ? `dari cache · 0 unit · ${(s.elapsedMs / 1000).toFixed(1)}s`
                          : `${s.units} unit · ${(s.elapsedMs / 1000).toFixed(1)}s`)}
                      {s.status === "failed" && "gagal"}
                    </p>
                  </div>
                </div>

                {s.status === "failed" && (
                  <div className="mt-2">
                    <p className="text-xs leading-5 text-rose-800">{s.error}</p>
                    <p className="mt-1 text-[11px] text-rose-700">
                      {s.billed
                        ? "Langkah ini tetap terhitung unit — task sudah dibuat sebelum gagal."
                        : "Ditolak sebelum task dibuat, jadi tidak ada unit terpakai."}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => retryFrom(i, false)}
                        disabled={running}
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 disabled:opacity-40"
                      >
                        Ulangi langkah ini
                      </button>
                      <button
                        onClick={() => retryFrom(i, true)}
                        disabled={running}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40"
                      >
                        Lewati, lanjut yang lain
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-zinc-500">
            {spent === 0 ? "Sejauh ini 0 unit." : `Sejauh ini ${spent} unit terpakai.`}
            {failedAt >= 0 && " Lapisan yang sudah jadi tetap tersimpan."}
          </p>
        </section>
      )}

      {/* --- result -------------------------------------------------------- */}
      {finalUrl && !running && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-zinc-900">
            {failedAt >= 0 ? "Sejauh ini" : "Look utuh"}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalUrl}
            alt="Look"
            className="mt-2 w-full rounded-xl border border-zinc-200"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={finalUrl}
              download="first-look.jpg"
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Unduh foto
            </a>
            <button
              onClick={() => void makeVideo()}
              disabled={videoBusy}
              className="rounded-md bg-rose-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {videoBusy ? "Membuat video…" : "Jadikan video — 5 unit"}
            </button>
          </div>
          {videoBusy && (
            <p className="mt-2 text-xs text-zinc-500">
              Video generatif jauh lebih lambat daripada try-on: sekitar satu menit untuk
              klip 5 detik.
            </p>
          )}
        </section>
      )}

      {video?.error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {video.error}
        </p>
      )}
      {video?.url && (
        <section className="mt-6">
          <video
            src={video.url}
            className="w-full rounded-xl border border-zinc-200"
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
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Unduh video
            </a>
            <span className="text-xs text-zinc-500">
              {video.units === 0 ? "Dari cache — 0 unit." : `${video.units} unit.`}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {framing === "beauty"
              ? "Klip ini menangkap suasananya, bukan detail produknya — perhiasan halus bisa bergeser bentuknya saat dianimasikan."
              : "Perhatikan jatuhnya bahan, bukan wajahnya: di jarak seluruh badan wajah digambar ulang oleh model dan bisa bergeser. Kameranya juga cenderung maju sendiri sampai kadang memotong sepatu, jadi patokan panjang kain tetap fotonya."}
          </p>
        </section>
      )}

      {/* --- details ------------------------------------------------------- */}
      <section className="mt-10 border-t border-zinc-200 pt-6">
        <h2 className="text-sm font-medium text-zinc-900">Detail tangan</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Cincin dan gelang tidak bisa masuk ke foto yang sama — keduanya makro tangan, dan
          tidak ada try-on yang menempelkan satu foto ke foto lain. Keduanya berdiri sebagai
          tile terpisah, seperti moodboard pengantin pada umumnya.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {DETAILS.map((d) => (
            <div key={d.feature}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={details[d.feature] ?? d.photo}
                alt={d.label}
                className="w-full rounded-lg border border-zinc-200"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-800">{d.label}</span>
                {details[d.feature] ? (
                  <a
                    href={details[d.feature]}
                    download={`first-look-${d.feature}.jpg`}
                    className="text-[11px] font-medium text-rose-700"
                  >
                    Unduh
                  </a>
                ) : (
                  <button
                    onClick={() => void runDetail(d)}
                    className="text-[11px] font-medium text-rose-700"
                  >
                    Coba
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
