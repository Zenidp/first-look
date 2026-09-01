"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prepareImage } from "@/lib/prepare-image";

/**
 * The composite look board.
 *
 * Every other surface in this app shows one try-on at a time. This one runs
 * them as a chain — each result becomes the next step's input — so the bride
 * ends up with a single photograph of the whole look rather than five separate
 * pictures she has to imagine together. Then it animates that photograph.
 *
 * The demo photo is served from /public so the bytes the browser uploads are
 * byte-identical to the ones the fixtures were built from. That is what makes
 * the deployed demo replay for zero units; a re-encode would miss every cache
 * entry and quietly bill a live call for each step (FINDINGS section 2e).
 */

type Stage = {
  feature: string;
  label: string;
  source: "fixture" | "live";
  imageUrl?: string;
  unitsSpent: number;
  unitsSavedByCache: number;
  elapsedMs: number;
  key: string;
};

type ComposeResponse = {
  imageUrl?: string;
  stages?: Stage[];
  unitsSpent?: number;
  unitsSavedByCache?: number;
  totalMs?: number;
  error?: string;
  code?: string;
  failedStep?: { feature: string; label: string; billed: boolean };
};

type VideoResponse = {
  imageUrl?: string;
  source?: "fixture" | "live";
  unitsSpent?: number;
  unitsSavedByCache?: number;
  pollMs?: number;
  totalMs?: number;
  error?: string;
};

type Detail = {
  feature: string;
  label: string;
  photo: string;
  referenceId: string;
};

const DETAILS: Detail[] = [
  { feature: "ring", label: "Cincin", photo: "/demo/hand-ring.jpg", referenceId: "ring-gold-solitaire" },
  { feature: "bracelet", label: "Gelang", photo: "/demo/hand-bracelet.jpg", referenceId: "bracelet-gold-cuff" },
];

const DEMO_PHOTO = "/demo/half-body.jpg";

export default function LookPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>(DEMO_PHOTO);

  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState<ComposeResponse | null>(null);

  const [rendering, setRendering] = useState(false);
  const [video, setVideo] = useState<VideoResponse | null>(null);

  const [details, setDetails] = useState<Record<string, string>>({});
  const objectUrl = useRef<string | null>(null);

  // Load the demo photo as a File so the same code path handles it and an
  // uploaded one. Fetching from /public preserves the bytes exactly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(DEMO_PHOTO);
      const blob = await res.blob();
      if (cancelled) return;
      setPhoto(new File([blob], "half-body.jpg", { type: "image/jpeg" }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const onPick = useCallback(async (file: File) => {
    const prepared = await prepareImage(file);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(prepared);
    setPhoto(prepared);
    setPhotoUrl(objectUrl.current);
    setCompose(null);
    setVideo(null);
  }, []);

  async function runCompose() {
    if (!photo) return;
    setComposing(true);
    setCompose(null);
    setVideo(null);
    try {
      const body = new FormData();
      body.append("photo", photo);
      body.append("recipe", "jawa-klasik");
      const res = await fetch("/api/look/compose", { method: "POST", body });
      setCompose(await res.json());
    } catch (err) {
      setCompose({ error: err instanceof Error ? err.message : "Gagal menyusun look" });
    } finally {
      setComposing(false);
    }
  }

  async function runVideo() {
    const source = compose?.imageUrl;
    if (!source) return;
    setRendering(true);
    setVideo(null);
    try {
      // Re-upload the finished composite as the video's source photo. It is
      // already a conforming jpg at 747x1024, well inside the endpoint's
      // 1:2.5-2.5:1 aspect window.
      const blob = await (await fetch(source)).blob();
      const body = new FormData();
      body.append("photo", new File([blob], "look.jpg", { type: "image/jpeg" }));
      body.append(
        "options",
        JSON.stringify({
          resolution: "480",
          duration: 5,
          prompt:
            "The bride smiles gently and turns her head slightly toward the camera. " +
            "Subtle natural motion, soft studio light, the fabric and earrings catching " +
            "the light. The camera holds still.",
          negativePrompt:
            "changing outfit, changing background, changing hairstyle, distorted face, " +
            "extra hands, warping jewellery, camera zoom, cuts, text, watermark",
        }),
      );
      const res = await fetch("/api/tryon/imageToVideo", { method: "POST", body });
      setVideo(await res.json());
    } catch (err) {
      setVideo({ error: err instanceof Error ? err.message : "Gagal membuat video" });
    } finally {
      setRendering(false);
    }
  }

  async function runDetail(d: Detail) {
    const blob = await (await fetch(d.photo)).blob();
    const body = new FormData();
    body.append("photo", new File([blob], `${d.feature}.jpg`, { type: "image/jpeg" }));
    body.append("referenceId", d.referenceId);
    const res = await fetch(`/api/tryon/${d.feature}`, { method: "POST", body });
    const json = await res.json();
    if (json.imageUrl) setDetails((prev) => ({ ...prev, [d.feature]: json.imageUrl }));
  }

  const stages = compose?.stages ?? [];
  const finalImage = compose?.imageUrl;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-rose-700">First Look</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Satu look utuh
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Kebaya, sanggul, makeup, kalung dan anting ditumpuk berurutan di atas satu
          foto yang sama — hasilnya satu foto asli, bukan kolase. Setelah itu foto
          tersebut bisa digerakkan menjadi video.
        </p>
      </header>

      {/* --- photo ------------------------------------------------------- */}
      <section className="mb-8">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Foto pengantin"
            className="w-28 shrink-0 rounded-lg border border-zinc-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">Foto dasar</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Setengah badan, pinggang ke atas. Wajah harus cukup besar untuk makeup
              dan perhiasan, sekaligus menyisakan badan untuk kebaya — foto seluruh
              badan gagal di syarat pertama, foto close-up gagal di syarat kedua.
            </p>
            <label className="mt-3 inline-block cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              Ganti foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPick(f);
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <button
        onClick={runCompose}
        disabled={composing || !photo}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {composing ? "Menyusun look…" : "Susun look utuh"}
      </button>
      {composing && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Lima try-on berurutan. Sekitar 30 detik kalau live, seketika kalau sudah
          tersimpan di cache.
        </p>
      )}

      {compose?.error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p className="font-medium">{compose.error}</p>
          {compose.failedStep && (
            <p className="mt-1 text-xs">
              {compose.failedStep.billed
                ? "Langkah ini tetap menghabiskan unit — task sudah dibuat sebelum gagal."
                : "Ditolak sebelum task dibuat, jadi tidak ada unit yang terpakai."}
            </p>
          )}
        </div>
      )}

      {/* --- stages ------------------------------------------------------ */}
      {stages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-900">Lapisan yang ditumpuk</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Urutannya bukan selera: setiap langkah mengecat ulang wilayahnya, jadi yang
            areanya paling luas harus lebih dulu. Kalung sebelum kebaya akan tertimbun.
          </p>
          <ol className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {stages.map((s, i) => (
              <li key={s.key} className="w-28 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imageUrl}
                  alt={s.label}
                  className="w-full rounded-md border border-zinc-200"
                />
                <p className="mt-1.5 text-xs font-medium text-zinc-800">
                  {i + 1}. {s.label}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {s.source === "fixture"
                    ? `cache · 0 unit`
                    : `${(s.elapsedMs / 1000).toFixed(1)}s · ${s.unitsSpent} unit`}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* --- the finished look ------------------------------------------- */}
      {finalImage && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-900">Look utuh</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalImage}
            alt="Look pengantin utuh"
            className="mt-3 w-full rounded-xl border border-zinc-200"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={finalImage}
              download="first-look.jpg"
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Unduh foto
            </a>
            <button
              onClick={runVideo}
              disabled={rendering}
              className="rounded-md bg-rose-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {rendering ? "Membuat video…" : "Jadikan video"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {compose?.unitsSpent === 0
              ? `Seluruh rantai diputar dari cache — 0 unit, ${compose?.unitsSavedByCache} unit dihemat.`
              : `${compose?.unitsSpent} unit terpakai${
                  compose?.unitsSavedByCache ? `, ${compose.unitsSavedByCache} dihemat cache` : ""
                }.`}
          </p>
          {rendering && (
            <p className="mt-2 text-xs text-zinc-500">
              Video generatif jauh lebih lambat daripada try-on: sekitar satu menit
              untuk klip 5 detik.
            </p>
          )}
        </section>
      )}

      {/* --- video -------------------------------------------------------- */}
      {video?.error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {video.error}
        </p>
      )}
      {video?.imageUrl && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-zinc-900">Look bergerak</h2>
          <video
            src={video.imageUrl}
            className="mt-3 w-full rounded-xl border border-zinc-200"
            controls
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={video.imageUrl}
              download="first-look.mp4"
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Unduh video
            </a>
            <span className="text-xs text-zinc-500">
              {video.source === "fixture"
                ? "Diputar dari cache — 0 unit."
                : `${((video.pollMs ?? 0) / 1000).toFixed(0)}s · ${video.unitsSpent} unit.`}
            </span>
          </div>
        </section>
      )}

      {/* --- details ------------------------------------------------------ */}
      <section className="mt-10 border-t border-zinc-200 pt-6">
        <h2 className="text-sm font-medium text-zinc-900">Detail tangan</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Cincin dan gelang tidak bisa masuk ke foto yang sama. Keduanya makro
          tangan, dan tidak ada try-on yang bisa menempelkan satu foto ke foto lain —
          jadi keduanya berdiri sebagai tile terpisah, seperti moodboard pengantin
          pada umumnya.
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
