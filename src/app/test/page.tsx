"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prepareImage } from "@/lib/prepare-image";

type FeatureInfo = {
  id: string;
  label: string;
  group: string;
  kind: string;
  units: number;
  endpoint: string;
  hasTemplates: boolean;
  sourcePhotos?: number;
  returnsJson?: boolean;
  generative?: boolean;
  note?: string;
};

type Template = {
  id: string;
  thumb: string;
  title: string;
  category_name: string;
  keep_users_color?: boolean;
};

type RefItem = { id: string; label: string; region: string; use: string; url: string };

type Result = {
  feature: string;
  source: "live" | "fixture";
  imageUrl?: string;
  data?: Record<string, unknown>;
  unitsSpent: number;
  unitsSavedByCache?: number;
  pollMs?: number;
  polls?: number;
  originallyTookMs?: number;
  totalMs: number;
  key: string;
};

/**
 * Effect-driven features need a nested payload the UI cannot reasonably ask a
 * user to type. These are the shapes verified against the live API on 31 Aug
 * 2026 — the schema's own examples, which are stricter than they look:
 * lip_color rejects the request unless `morphology` and `style` are present.
 */
const EFFECT_DEFAULTS: Record<string, Record<string, unknown>> = {
  teethWhitening: { effect: { whitening_intensity: 80 }, index: 0 },
  eyeColor: { effect: { intensity: 75, enlargement: 0 } },
  nailColor: {
    effectType: "nail_polish",
    effects: ["thumb", "index", "middle", "ring", "pinky"].map((finger) => ({
      sub_type: "color",
      finger,
      color: "#B0303F",
      texture: "cream",
      transparency: 0,
      reflection: 55,
      contrast: 50,
      roughness: 25,
    })),
  },
  makeupCustom: {
    effects: [
      {
        category: "lip_color",
        shape: { name: "plump" },
        morphology: { fullness: 20, wrinkless: 10 },
        style: { type: "full" },
        palettes: [
          { color: "#A32638", texture: "gloss", colorIntensity: 85, gloss: 60, transparencyIntensity: 25 },
        ],
      },
      {
        category: "blush",
        pattern: { name: "1color1" },
        palettes: [{ color: "#E08A8A", texture: "matte", colorIntensity: 55 }],
      },
    ],
  },
};

export default function TestPage() {
  const [features, setFeatures] = useState<FeatureInfo[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [mode, setMode] = useState("");
  const [featureId, setFeatureId] = useState("hairStyle");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesFetched, setTemplatesFetched] = useState(false);
  const [category, setCategory] = useState("All");

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [reference, setReference] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState("");
  const [library, setLibrary] = useState<RefItem[]>([]);
  const [libraryPending, setLibraryPending] = useState(0);
  const [referenceId, setReferenceId] = useState("");

  const [templateId, setTemplateId] = useState("");
  const [preset, setPreset] = useState("");
  const [gender, setGender] = useState("female");
  const [garmentCategory, setGarmentCategory] = useState("full_body");
  const [keepColor, setKeepColor] = useState(false);

  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const feature = features.find((f) => f.id === featureId);
  const needPhotos = feature?.sourcePhotos ?? 1;

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => {
        setFeatures(d.features ?? []);
        setPresets(d.enums?.hairColorPresets ?? []);
        setMode(d.mode ?? "");
      })
      .catch(() => setError("Could not load the feature registry."));
  }, []);

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((d) => { setLibrary(d.ready ?? []); setLibraryPending(d.pendingCount ?? 0); })
      .catch(() => {});
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // Selection state belongs to the change event, not to an effect — resetting
  // it inside useEffect would cascade an extra render on every feature switch.
  function changeFeature(next: string) {
    setFeatureId(next);
    setTemplateId("");
    setCategory("All");
    setTemplates([]);
    setTemplatesFetched(false);
    setResult(null);
    setError("");
    setPreset("");
    setReferenceId("");
    setPhotos([]);
    setPreviews([]);
  }

  // The one genuine external sync: fetch the catalogue for the chosen feature.
  useEffect(() => {
    const target = features.find((f) => f.id === featureId);
    if (!target?.hasTemplates) return;

    // Every setState here runs in a promise callback, never synchronously in
    // the effect body — that is what keeps this off the cascading-render path.
    let cancelled = false;
    fetch(`/api/templates/${featureId}?all=1`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setTemplates(d.templates ?? []); })
      .catch(() => { if (!cancelled) setError("Could not load templates."); })
      .finally(() => { if (!cancelled) setTemplatesFetched(true); });

    return () => { cancelled = true; };
  }, [featureId, features]);

  // One slot at a time. A multi-file picker returns files in the browser's own
  // order — alphabetical, so face-left lands before face-right — and the
  // diagnostics require front, right, left exactly. Wrong order returns
  // error_face_angle_invalid after the units are already charged.
  const pickPhotoAt = useCallback(async (index: number, file: File) => {
    setError("");
    try {
      const prepared = await prepareImage(file);
      setPhotos((prev) => { const next = [...prev]; next[index] = prepared; return next; });
      setPreviews((prev) => { const next = [...prev]; next[index] = URL.createObjectURL(prepared); return next; });
    } catch {
      setError("Could not read that image.");
    }
  }, []);

  async function pickReference(file: File) {
    try {
      const prepared = await prepareImage(file);
      setReference(prepared);
      setRefPreview(URL.createObjectURL(prepared));
    } catch {
      setError("Could not read the reference image.");
    }
  }

  async function run() {
    if (!feature || !photosReady) return;
    setBusy(true);
    setError("");
    setResult(null);
    setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setElapsed(Date.now() - t0), 100);

    try {
      const options: Record<string, unknown> = {};
      if (templateId) options.templateId = templateId;
      if (feature.kind === "preset") options.preset = preset;
      if (feature.kind === "styled") options.gender = gender;
      if (feature.kind === "garment" || featureId === "clothesTemplates") {
        options.garmentCategory = garmentCategory;
      }
      if (featureId === "hairStyle" && keepColor) options.hairColor = "src";
      if (feature.kind === "effects") Object.assign(options, EFFECT_DEFAULTS[featureId] ?? {});

      const body = new FormData();
      // Slot order is the wire order.
      for (let i = 0; i < needPhotos; i++) body.append("photo", photos[i]);
      if (reference) body.append("reference", reference);
      else if (referenceId) body.append("referenceId", referenceId);
      body.append("options", JSON.stringify(options));

      const res = await fetch(`/api/tryon/${featureId}`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.code ?? res.status}: ${data.error ?? "failed"}`);
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  }

  // Every slot filled — a sparse array would silently drop a photo.
  const photosReady =
    photos.length >= needPhotos &&
    Array.from({ length: needPhotos }, (_, i) => photos[i]).every(Boolean);

  const groups = [...new Set(features.map((f) => f.group))];
  const categories = ["All", ...new Set(templates.map((t) => t.category_name))];
  const shown = category === "All" ? templates : templates.filter((t) => t.category_name === category);
  const selected = templates.find((t) => t.id === templateId);

  const wantsReference =
    feature && ["reference", "garment", "styled", "jewelry"].includes(feature.kind);
  // eyeColor is the one effects feature that also needs a reference (the lens).
  const wantsLens = featureId === "eyeColor";
  const canRun =
    !!feature &&
    photosReady &&
    !busy &&
    (feature.kind !== "preset" || !!preset) &&
    (!feature.hasTemplates || feature.kind === "hybrid" ? true : !feature.hasTemplates || !!templateId) &&
    (!wantsReference || !!reference || !!referenceId || feature.kind === "hybrid") &&
    (!wantsLens || !!reference || !!referenceId);

  return (
    <main className="mx-auto max-w-md p-5 font-sans">
      <header>
        <h1 className="text-xl font-semibold">First Look — API studio</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {features.length} Perfect Corp features, all pinned to their newest version.
          {mode && <> Mode: <strong>{mode}</strong>.</>}
        </p>
      </header>

      <section className="mt-5">
        <label className="block text-sm font-medium">Feature</label>
        <select
          value={featureId}
          onChange={(e) => changeFeature(e.target.value)}
          className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {features.filter((f) => f.group === g).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} — {f.units} unit{f.units > 1 ? "s" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {feature && (
          <p className="mt-2 text-xs text-neutral-500">
            <code className="rounded bg-neutral-100 px-1">{feature.endpoint}</code>
            {feature.note && <> — {feature.note}</>}
          </p>
        )}
        {feature?.kind === "effects" && (
          <p className="mt-2 rounded-lg bg-neutral-100 p-2 text-xs text-neutral-600">
            Sends a verified default effect payload. Needs a photo that actually
            shows the target: open smile for teeth, close-up fingernails for nails.
          </p>
        )}
        {feature?.generative && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Generates a brand-new scene instead of editing her photo — different
            face framing, background and outfit. Not usable on the look board.
          </p>
        )}
      </section>

      <section className="mt-5">
        <label className="block text-sm font-medium">
          {needPhotos === 3 ? "Three photos, one slot each" : "Bride's photo"}
        </label>
        {needPhotos === 3 && (
          <p className="mt-1 text-xs text-neutral-500">
            The order matters and the API cannot infer it. Put each photo in its own
            slot — a wrong order returns <code>error_face_angle_invalid</code> after
            the units are already spent.
          </p>
        )}
        <div className="mt-2 space-y-3">
          {Array.from({ length: needPhotos }, (_, i) => (
            <div key={i}>
              {needPhotos === 3 && (
                <span className="block text-xs font-medium text-neutral-700">
                  {["1. Front (head straight, within 10°)",
                    "2. Right side (turned more than 15°)",
                    "3. Left side (turned more than 15°)"][i]}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhotoAt(i, f); }}
              />
              {previews[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[i]} alt="" className="mt-1 w-24 rounded-lg" />
              )}
            </div>
          ))}
        </div>
      </section>

      {feature?.kind === "preset" && (
        <section className="mt-5">
          <label className="block text-sm font-medium">Colour preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
          >
            <option value="">Choose…</option>
            {presets.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </section>
      )}

      {feature?.kind === "styled" && (
        <section className="mt-5">
          <label className="block text-sm font-medium">Gender (required by this endpoint)</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
          >
            <option value="female">female</option>
            <option value="male">male</option>
          </select>
        </section>
      )}

      {(feature?.kind === "garment" || featureId === "clothesTemplates") && (
        <section className="mt-5">
          <label className="block text-sm font-medium">Garment category</label>
          <select
            value={garmentCategory}
            onChange={(e) => setGarmentCategory(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
          >
            {["full_body", "upper_body", "lower_body", "outer", "shoes", "auto"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </section>
      )}

      {(wantsReference || wantsLens) && (
        <section className="mt-5">
          <label className="block text-sm font-medium">
            Reference {feature?.group === "Jewellery" ? "product photo" : "photo"}
            {feature?.kind === "hybrid" && " (optional if you pick a template)"}
          </label>
          {/* The Nusantara library: kebaya, hijab and regional makeup that
              Perfect Corp's own catalogues do not carry at all. */}
          {library.filter((r) => r.use === featureId).length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {library.filter((r) => r.use === featureId).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setReferenceId(r.id); setReference(null); setRefPreview(r.url); }}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                    referenceId === r.id ? "border-black" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={r.label} className="h-24 w-20 object-cover" />
                  <span className="block px-1 py-0.5 text-[10px]">{r.region}</span>
                </button>
              ))}
            </div>
          )}
          {libraryPending > 0 && library.filter((r) => r.use === featureId).length === 0 && (
            <p className="mt-2 text-xs text-neutral-500">
              {libraryPending} Nusantara slots declared, none filled yet — add images and
              credits per <code>public/references/README.md</code>. Upload one manually below.
            </p>
          )}
          <input
            type="file"
            accept="image/*"
            className="mt-2 w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setReferenceId(""); pickReference(f); }
            }}
          />
          {refPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={refPreview} alt="" className="mt-2 w-32 rounded-lg" />
          )}
        </section>
      )}

      {feature?.hasTemplates && (
        <section className="mt-5">
          <label className="block text-sm font-medium">
            Template {templates.length > 0 && `(${templates.length})`}
          </label>
          {!templatesFetched && <p className="mt-2 text-xs text-neutral-500">Loading catalogue…</p>}
          {categories.length > 2 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
            {shown.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`overflow-hidden rounded-lg border-2 text-left ${
                  templateId === t.id ? "border-black" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumb} alt={t.title} loading="lazy" className="aspect-square w-full object-cover" />
                <span className="block px-1 py-1 text-[10px] leading-tight">{t.title}</span>
              </button>
            ))}
          </div>
          {selected?.keep_users_color && featureId === "hairStyle" && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={keepColor} onChange={(e) => setKeepColor(e.target.checked)} />
              Keep her own hair colour
            </label>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={run}
        disabled={!canRun}
        className="mt-6 w-full rounded-lg bg-black py-3 text-white disabled:opacity-40"
      >
        {busy
          ? `Generating… ${(elapsed / 1000).toFixed(1)}s`
          : `Run${feature ? ` — costs ${feature.units} unit${feature.units > 1 ? "s" : ""}` : ""}`}
      </button>
      {busy && (
        <p className="mt-2 text-center text-xs text-neutral-500">
          Polling every 1.5s. Do not refresh — an abandoned task can still be billed.
        </p>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {result && (
        <section className="mt-6">
          {result.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.imageUrl} alt="Result" className="w-full rounded-lg" />
          )}
          {result.data && (
            <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-neutral-600">
            <dt>Source</dt>
            <dd className="text-right font-medium">
              {result.source === "live" ? "live API call" : "fixture cache"}
            </dd>
            <dt>Units spent</dt>
            <dd className="text-right font-medium">{result.unitsSpent}</dd>
            {result.source === "live" ? (
              <>
                <dt>Poll time</dt>
                <dd className="text-right">
                  {((result.pollMs ?? 0) / 1000).toFixed(1)}s over {result.polls} polls
                </dd>
              </>
            ) : (
              <>
                <dt>Units saved</dt>
                <dd className="text-right">{result.unitsSavedByCache}</dd>
                <dt>Live call took</dt>
                <dd className="text-right">{((result.originallyTookMs ?? 0) / 1000).toFixed(1)}s</dd>
              </>
            )}
            <dt>Round trip</dt>
            <dd className="text-right">{(result.totalMs / 1000).toFixed(1)}s</dd>
            <dt>Fixture key</dt>
            <dd className="truncate text-right font-mono">{result.key}</dd>
          </dl>
        </section>
      )}
    </main>
  );
}
