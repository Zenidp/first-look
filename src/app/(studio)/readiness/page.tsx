"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import StudioHeader from "@/components/layout/studio-header";
import PhotoCropper from "@/components/PhotoCropper";
import { explain } from "@/lib/errors";
import {
  STYLE_TARGETS,
  assessReadiness,
  monthsUntil,
  type Diagnosis,
  type Readiness,
} from "@/lib/readiness";

/**
 * Hair Readiness.
 *
 * The rest of the app answers "what would this look like?". This screen answers
 * the question that is only asked at the trial, weeks out, when it is too late:
 * can her hair actually reach this style by the wedding?
 *
 * Three diagnostics run against her photos, and a rule layer in
 * src/lib/readiness.ts turns them plus the date into a verdict. Every threshold
 * that fired is shown — CONTEXT §6 asks for a visible "why", and a bride told
 * "not by then" is owed the number that said so.
 *
 * Hair density is not here. It rejected every photo in this project with
 * `error_face_angle_invalid`, front and side alike. Three attempts, no result.
 */

type Slot = { key: "front" | "right" | "left"; label: string; hint: string };

/**
 * Order is wire order. The three-photo diagnostics read these as front, right,
 * left and answer differently if they are swapped — a multi-file picker returns
 * files alphabetically, which is how that was discovered (FINDINGS §2d).
 */
const SLOTS: Slot[] = [
  { key: "front", label: "Front", hint: "Facing the camera, head upright." },
  { key: "right", label: "Three-quarter right", hint: "Body turned ±45°, nose toward the right edge." },
  { key: "left", label: "Three-quarter left", hint: "Body turned ±45°, nose toward the left edge." },
];

const DEMO: Record<Slot["key"], string> = {
  front: "/demo/face-front-hairdown.jpg",
  right: "/demo/face-right.jpg",
  left: "/demo/face-left.jpg",
};

type StepId = "hairLengthDetection" | "hairTypeDetection" | "hairFrizzinessDetection";

const STEPS: { id: StepId; label: string; photos: 1 | 3; units: number }[] = [
  { id: "hairLengthDetection", label: "Hair length", photos: 1, units: 2 },
  { id: "hairTypeDetection", label: "Hair type", photos: 3, units: 2 },
  { id: "hairFrizzinessDetection", label: "Hair condition", photos: 3, units: 2 },
];

type StepState = { status: "idle" | "running" | "done" | "failed"; units: number; error?: string };

export default function ReadinessPage() {
  const [photos, setPhotos] = useState<Partial<Record<Slot["key"], File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Slot["key"], string>>>({});
  const [cropping, setCropping] = useState<{ file: File; slot: Slot["key"] } | null>(null);

  const [weddingDate, setWeddingDate] = useState("");
  const [targetId, setTargetId] = useState(STYLE_TARGETS[1].id);

  const [steps, setSteps] = useState<Record<StepId, StepState>>({
    hairLengthDetection: { status: "idle", units: 0 },
    hairTypeDetection: { status: "idle", units: 0 },
    hairFrizzinessDetection: { status: "idle", units: 0 },
  });
  const [diagnosis, setDiagnosis] = useState<Diagnosis>({});
  const [running, setRunning] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const objectUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const u of objectUrls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  const target = STYLE_TARGETS.find((t) => t.id === targetId) ?? STYLE_TARGETS[0];
  const haveAll = SLOTS.every((s) => photos[s.key]);
  const dated = weddingDate ? new Date(weddingDate) : null;

  const readiness: Readiness | null =
    dated && Object.keys(diagnosis).length > 0
      ? assessReadiness(diagnosis, target, dated)
      : null;

  const loadDemo = useCallback(async () => {
    const next: Partial<Record<Slot["key"], File>> = {};
    for (const s of SLOTS) {
      const blob = await (await fetch(DEMO[s.key])).blob();
      next[s.key] = new File([blob], `${s.key}.jpg`, { type: "image/jpeg" });
    }
    setPhotos(next);
    setPreviews(Object.fromEntries(SLOTS.map((s) => [s.key, DEMO[s.key]])));
    setDiagnosis({});
  }, []);

  async function runDiagnostics() {
    if (!haveAll) return;
    setRunning(true);
    setDiagnosis({});

    const found: Diagnosis = {};

    for (const step of STEPS) {
      setSteps((p) => ({ ...p, [step.id]: { status: "running", units: 0 } }));

      const body = new FormData();
      // A single-photo diagnostic reads hair, so it gets the hair-down front
      // shot; the three-photo ones need all angles, in order.
      if (step.photos === 1) body.append("photo", photos.front!);
      else for (const s of SLOTS) body.append("photo", photos[s.key]!);
      body.append("options", JSON.stringify({}));

      try {
        const res = await fetch(`/api/tryon/${step.id}`, { method: "POST", body });
        const data = await res.json();

        if (!res.ok) {
          setSteps((p) => ({
            ...p,
            [step.id]: { status: "failed", units: 0, error: explain(data.code, data.error) },
          }));
          continue; // One diagnostic failing must not lose the other two.
        }

        const d = data.data ?? {};
        if (d.hair_length) found.lengthTerm = d.hair_length.term;
        if (d.hair_type) {
          found.typeMapping = d.hair_type.mapping;
          found.typeTerm = d.hair_type.term;
        }
        if (d.hair_frizziness) {
          found.frizzMapping = d.hair_frizziness.mapping;
          found.frizzTerm = d.hair_frizziness.term;
        }

        setSteps((p) => ({
          ...p,
          [step.id]: { status: "done", units: data.unitsSpent ?? 0 },
        }));
        setDiagnosis({ ...found });
      } catch (err) {
        setSteps((p) => ({
          ...p,
          [step.id]: {
            status: "failed",
            units: 0,
            error: err instanceof Error ? err.message : "The connection dropped.",
          },
        }));
      }
    }

    setRunning(false);
  }

  const spent = Object.values(steps).reduce((s, x) => s + x.units, 0);

  if (cropping) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <PhotoCropper
          file={cropping.file}
          framing="beauty"
          onCancel={() => setCropping(null)}
          onDone={(file, url) => {
            objectUrls.current.push(url);
            setPhotos((p) => ({ ...p, [cropping.slot]: file }));
            setPreviews((p) => ({ ...p, [cropping.slot]: url }));
            setCropping(null);
            setDiagnosis({});
          }}
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <StudioHeader eyebrow="Hair readiness" title="Can her hair get there?">
        A sanggul that fails on the day is usually not about the artist’s skill. It is
        about hair condition, discovered at the trial when it is already too late to
        fix. This checks it now, while there is still something to be done.
      </StudioHeader>

      {/* --- photos ------------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-ink">1. Three photos of her hair</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          <strong className="font-medium text-ink-soft">Hair must be worn loose in all three.</strong>{" "}
          Tied-back hair hides its own texture, and the diagnostic then answers about the
          photograph rather than about her hair. Measured: the same hair reads a full band
          straighter in a bun than worn loose.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {SLOTS.map((s) => (
            <div key={s.key}>
              <label className="block cursor-pointer">
                {previews[s.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previews[s.key]}
                    alt={s.label}
                    className="aspect-3/4 w-full rounded-lg border border-line object-cover"
                  />
                ) : (
                  <div className="flex aspect-3/4 w-full items-center justify-center rounded-lg border border-dashed border-line-strong text-[11px] text-ink-faint">
                    choose
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCropping({ file: f, slot: s.key });
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="mt-1 text-xs font-medium text-ink">{s.label}</p>
              <p className="text-[10px] leading-4 text-ink-faint">{s.hint}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => void loadDemo()}
          className="mt-3 rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"
        >
          Use the sample
        </button>
      </section>

      {/* --- date and target ---------------------------------------------- */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="wd">
            2. Wedding date
          </label>
          <input
            id="wd"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line-strong bg-paper p-2 text-sm text-ink"
          />
          {dated && (
            <p className="mt-1 text-xs text-ink-faint">{monthsUntil(dated)} months away.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="tg">
            3. Target style
          </label>
          <select
            id="tg"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line-strong bg-paper p-2 text-sm text-ink"
          >
            {STYLE_TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs leading-5 text-ink-faint">{target.why}</p>
        </div>
      </section>

      <button
        onClick={() => void runDiagnostics()}
        disabled={!haveAll || !weddingDate || running}
        className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-40"
      >
        {running
          ? "Checking…"
          : !haveAll
            ? "Add all three photos"
            : !weddingDate
              ? "Set the wedding date"
              : "Check readiness — 6 units"}
      </button>

      {/* --- diagnostics --------------------------------------------------- */}
      {STEPS.some((s) => steps[s.id].status !== "idle") && (
        <ul className="mt-6 space-y-2">
          {STEPS.map((s) => {
            const st = steps[s.id];
            return (
              <li
                key={s.id}
                className={`rounded-lg border p-3 text-sm ${
                  st.status === "failed" ? "border-prep/30 bg-prep-tint" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{s.label}</span>
                  <span className="text-xs text-ink-faint">
                    {st.status === "running" && "checking…"}
                    {st.status === "done" && (st.units === 0 ? "from cache · 0 units" : `${st.units} units`)}
                    {st.status === "failed" && "failed"}
                    {st.status === "idle" && "waiting"}
                  </span>
                </div>
                {st.error && <p className="mt-1 text-xs leading-5 text-prep">{st.error}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {Object.keys(diagnosis).length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-line p-3">
          {[
            ["Length", diagnosis.lengthTerm],
            ["Type", diagnosis.typeTerm],
            ["Condition", diagnosis.frizzTerm],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{k}</dt>
              <dd className="text-xs font-medium text-ink">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      {spent > 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          {spent === 0 ? "0 units." : `${spent} units spent.`}
        </p>
      )}

      {/* --- verdict ------------------------------------------------------- */}
      {readiness && readiness.verdict !== "unknown" && (
        <section className="mt-8">
          {/* The verdict is carried by three things at once — a left rule, a
              tint and the word itself — so it does not depend on hue alone.
              A bride who cannot distinguish the red from the green still reads
              "Belum sampai". */}
          <div
            className={`rounded-frame border border-l-4 p-5 ${
              readiness.verdict === "ready"
                ? "border-ready/30 border-l-ready bg-ready-tint"
                : readiness.verdict === "prep"
                  ? "border-prep/30 border-l-prep bg-prep-tint"
                  : "border-late/30 border-l-late bg-late-tint"
            }`}
          >
            <p
              className={`text-step--2 font-medium tracking-[0.18em] uppercase ${
                readiness.verdict === "ready"
                  ? "text-ready"
                  : readiness.verdict === "prep"
                    ? "text-prep"
                    : "text-late"
              }`}
            >
              {readiness.verdict === "ready"
                ? "Ready"
                : readiness.verdict === "prep"
                  ? "Ready, with preparation"
                  : "Not by then"}
            </p>
            <p className="mt-2 font-display text-step-1 leading-snug text-ink">
              {readiness.headline}
            </p>

            {readiness.blockers.length > 0 && (
              <ul className="mt-3 space-y-2">
                {readiness.blockers.map((b) => (
                  <li key={b.kind} className="text-sm leading-6 text-ink-soft">
                    {b.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {readiness.alternatives.length > 0 && (
            <div className="mt-4 rounded-xl border border-line p-4">
              <h3 className="text-sm font-medium text-ink">What can be done</h3>
              <ul className="mt-2 space-y-3">
                {readiness.alternatives.map((a, i) => (
                  <li key={i} className="text-sm leading-6 text-ink-soft">
                    {a.kind === "style" ? (
                      <>
                        <button
                          onClick={() => setTargetId(a.targetId)}
                          className="font-medium text-accent underline"
                        >
                          {a.label}
                        </button>{" "}
                        — {a.note}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-ink">Hair extensions</span> — {a.note}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {readiness.plan.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-ink">The plan up to the day</h3>
              <ol className="mt-2 space-y-3 border-l border-line pl-4">
                {readiness.plan.map((p, i) => (
                  <li key={i}>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
                      {p.when}
                    </p>
                    <p className="text-sm leading-6 text-ink-soft">{p.action}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            onClick={() => setShowWhy((v) => !v)}
            className="mt-4 text-xs font-medium text-ink-faint underline"
          >
            {showWhy ? "Hide the reasoning" : "Why this verdict?"}
          </button>
          {showWhy && (
            <ul className="mt-2 space-y-1.5 rounded-lg bg-surface p-3">
              {readiness.reasoning.map((r, i) => (
                <li key={i} className="text-xs leading-5 text-ink-soft">
                  {r}
                </li>
              ))}
              <li className="pt-1 text-[11px] leading-5 text-ink-faint">
                Growth is estimated at an average 1.25 cm a month, and the length of each
                band is our own estimate — the API returns a word, not a measurement. Treat
                the result as a range, not a fixed date.
              </li>
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
