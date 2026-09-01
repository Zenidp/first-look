"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LOOK_RECIPES, type LookRecipe } from "@/lib/look";
import { prepareImage } from "@/lib/prepare-image";

/**
 * The composite look board.
 *
 * Every other surface in this app shows one try-on at a time. This one runs
 * them as a chain — each result becomes the next step's input — so the bride
 * ends up with a single photograph of the whole look rather than five separate
 * pictures she has to imagine together. Then it animates that photograph.
 *
 * There are two looks and they answer different questions rather than
 * competing. The beauty look is built on a waist-up frame and carries makeup,
 * hair and jewellery; the outfit look is built on a full-body frame, where a
 * ~75px face is under the API's 128px minimum and the garment is therefore the
 * only thing that can be composited — or animated. See src/lib/look.ts.
 *
 * Demo photos are served from /public so the bytes the browser uploads are
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

/** Per-look state, keyed by recipe id so the two tracks never share a result. */
type TrackState = {
  photo: File | null;
  photoUrl: string;
  compose: ComposeResponse | null;
  video: VideoResponse | null;
  busy: "compose" | "video" | null;
};

const blank = (photoUrl: string): TrackState => ({
  photo: null,
  photoUrl,
  compose: null,
  video: null,
  busy: null,
});

export default function LookPage() {
  const [tracks, setTracks] = useState<Record<string, TrackState>>(() =>
    Object.fromEntries(
      LOOK_RECIPES.map((r) => [r.id, blank(`/demo/${r.photo}`)]),
    ),
  );
  const [details, setDetails] = useState<Record<string, string>>({});
  const objectUrls = useRef<string[]>([]);

  const patch = useCallback((id: string, next: Partial<TrackState>) => {
    setTracks((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  }, []);

  // Load each look's demo photo as a File so uploading it and picking your own
  // go through exactly the same path. Fetching from /public preserves the bytes.
  useEffect(() => {
    let cancelled = false;
    for (const r of LOOK_RECIPES) {
      void (async () => {
        const blob = await (await fetch(`/demo/${r.photo}`)).blob();
        if (cancelled) return;
        patch(r.id, { photo: new File([blob], r.photo, { type: "image/jpeg" }) });
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [patch]);

  useEffect(
    () => () => {
      for (const u of objectUrls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  async function pick(recipe: LookRecipe, file: File) {
    const prepared = await prepareImage(file);
    const url = URL.createObjectURL(prepared);
    objectUrls.current.push(url);
    patch(recipe.id, { photo: prepared, photoUrl: url, compose: null, video: null });
  }

  async function runCompose(recipe: LookRecipe) {
    const track = tracks[recipe.id];
    if (!track?.photo) return;
    patch(recipe.id, { busy: "compose", compose: null, video: null });
    try {
      const body = new FormData();
      body.append("photo", track.photo);
      body.append("recipe", recipe.id);
      const res = await fetch("/api/look/compose", { method: "POST", body });
      patch(recipe.id, { compose: await res.json(), busy: null });
    } catch (err) {
      patch(recipe.id, {
        compose: { error: err instanceof Error ? err.message : "Gagal menyusun look" },
        busy: null,
      });
    }
  }

  async function runVideo(recipe: LookRecipe) {
    const source = tracks[recipe.id]?.compose?.imageUrl;
    if (!source) return;
    patch(recipe.id, { busy: "video", video: null });
    try {
      // Re-upload the finished still as the video's source. It is already a
      // conforming jpg at 747x1024, well inside the endpoint's 1:2.5-2.5:1
      // aspect window.
      const blob = await (await fetch(source)).blob();
      const body = new FormData();
      body.append("photo", new File([blob], "look.jpg", { type: "image/jpeg" }));
      body.append(
        "options",
        JSON.stringify({
          resolution: "480",
          duration: 5,
          prompt: recipe.video.prompt,
          negativePrompt: recipe.video.negativePrompt,
        }),
      );
      const res = await fetch("/api/tryon/imageToVideo", { method: "POST", body });
      patch(recipe.id, { video: await res.json(), busy: null });
    } catch (err) {
      patch(recipe.id, {
        video: { error: err instanceof Error ? err.message : "Gagal membuat video" },
        busy: null,
      });
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-rose-700">First Look</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Satu look utuh
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Setiap pilihan ditumpuk berurutan di atas satu foto yang sama — hasilnya
          foto asli, bukan kolase. Lalu foto itu bisa digerakkan menjadi video.
        </p>
      </header>

      {LOOK_RECIPES.map((recipe) => (
        <Track
          key={recipe.id}
          recipe={recipe}
          state={tracks[recipe.id] ?? blank(`/demo/${recipe.photo}`)}
          onPick={(f) => void pick(recipe, f)}
          onCompose={() => void runCompose(recipe)}
          onVideo={() => void runVideo(recipe)}
        />
      ))}

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

function Track({
  recipe,
  state,
  onPick,
  onCompose,
  onVideo,
}: {
  recipe: LookRecipe;
  state: TrackState;
  onPick: (f: File) => void;
  onCompose: () => void;
  onVideo: () => void;
}) {
  const { compose, video, busy } = state;
  const stages = compose?.stages ?? [];
  const finalImage = compose?.imageUrl;
  const multiStep = recipe.steps.length > 1;

  return (
    <section className="mb-12 border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{recipe.label}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{recipe.blurb}</p>

      <div className="mt-4 flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.photoUrl}
          alt={`Foto dasar — ${recipe.label}`}
          className="w-24 shrink-0 rounded-lg border border-zinc-200 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-900">Foto dasar</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {multiStep
              ? "Setengah badan. Wajah harus cukup besar untuk makeup dan perhiasan, sekaligus menyisakan badan untuk kebaya."
              : "Seluruh badan. Wajahnya terlalu kecil untuk makeup dan perhiasan di sini — bajunya satu-satunya yang bisa dipasang, dan itu memang yang dilihat."}
          </p>
          <label className="mt-2 inline-block cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Ganti foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(f);
              }}
            />
          </label>
        </div>
      </div>

      <button
        onClick={onCompose}
        disabled={busy !== null || !state.photo}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy === "compose"
          ? "Menyusun…"
          : multiStep
            ? "Susun look utuh"
            : "Pakaikan kebaya"}
      </button>
      {busy === "compose" && multiStep && (
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

      {/* Only worth showing when there is actually a sequence to show. */}
      {multiStep && stages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-900">Lapisan yang ditumpuk</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Urutannya bukan selera: setiap langkah mengecat ulang wilayahnya, jadi yang
            areanya paling luas harus lebih dulu. Kalung sebelum kebaya akan tertimbun.
          </p>
          <ol className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {stages.map((s, i) => (
              <li key={s.key} className="w-24 shrink-0">
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
                    ? "cache · 0 unit"
                    : `${(s.elapsedMs / 1000).toFixed(1)}s · ${s.unitsSpent} unit`}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {finalImage && (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalImage}
            alt={recipe.label}
            className="w-full rounded-xl border border-zinc-200"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={finalImage}
              download={`first-look-${recipe.id}.jpg`}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Unduh foto
            </a>
            <button
              onClick={onVideo}
              disabled={busy !== null}
              className="rounded-md bg-rose-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {busy === "video" ? "Membuat video…" : "Jadikan video"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {compose?.unitsSpent === 0
              ? `Diputar dari cache — 0 unit, ${compose?.unitsSavedByCache} unit dihemat.`
              : `${compose?.unitsSpent} unit terpakai${
                  compose?.unitsSavedByCache ? `, ${compose.unitsSavedByCache} dihemat cache` : ""
                }.`}
          </p>
          {busy === "video" && (
            <p className="mt-2 text-xs text-zinc-500">
              Video generatif jauh lebih lambat daripada try-on: sekitar satu menit
              untuk klip 5 detik.
            </p>
          )}
        </div>
      )}

      {video?.error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {video.error}
        </p>
      )}
      {video?.imageUrl && (
        <div className="mt-6">
          <video
            src={video.imageUrl}
            className="w-full rounded-xl border border-zinc-200"
            controls
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={video.imageUrl}
              download={`first-look-${recipe.id}.mp4`}
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
          {/*
            Honesty, not a disclaimer. At full-body scale the head is ~65px after
            the 480p downscale, so the model re-synthesises it and the identity
            drifts by the last frame. The garment survives; her face does not.
            And the camera pushes in on both clips despite the negative prompt,
            which here can crop the shoes — hem length is part of the decision,
            so the still has to stay the record of it.
          */}
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {multiStep
              ? "Klip ini menangkap suasananya, bukan detail produknya — perhiasan halus bisa bergeser bentuknya saat dianimasikan."
              : "Perhatikan jatuhnya bahan, bukan wajahnya: di jarak seluruh badan wajah digambar ulang oleh model dan bisa bergeser. Kameranya juga cenderung maju sendiri sampai kadang memotong sepatu, jadi patokan panjang kain tetap fotonya."}
          </p>
        </div>
      )}
    </section>
  );
}
