"use client";

import { useEffect, useRef, useState } from "react";

import StudioHeader from "@/components/layout/studio-header";
import { prepareImage } from "@/lib/prepare-image";

type Concept = {
  id: string;
  label: string;
  blurb: string;
  feature: string;
  style: string;
  verified: boolean;
};

type Generated = {
  conceptId: string;
  label: string;
  source: "live" | "fixture";
  imageUrl: string;
  unitsSpent: number;
  pollMs?: number;
  totalMs: number;
};

export default function PreweddingPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [unitsPerConcept, setUnitsPerConcept] = useState(2);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<Generated[]>([]);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/concepts")
      .then((r) => r.json())
      .then((d) => {
        setConcepts(d.concepts ?? []);
        setUnitsPerConcept(d.unitsPerConcept ?? 2);
      })
      .catch(() => setError("Could not load the concept list."));
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function pick(file: File) {
    setError("");
    try {
      const prepared = await prepareImage(file);
      setPhoto(prepared);
      setPreview(URL.createObjectURL(prepared));
      setResults([]);
    } catch {
      setError("That photo could not be read. Use an ordinary jpg or png.");
    }
  }

  async function generate(concept: Concept) {
    if (!photo || running) return;
    setRunning(concept.id);
    setError("");
    setElapsed(0);
    // Accumulate rather than reading the clock: this is a progress readout, and
    // a wall-clock call here is flagged as impure by the React compiler rules.
    timer.current = setInterval(() => setElapsed((ms) => ms + 100), 100);

    try {
      const body = new FormData();
      body.append("photo", photo);
      body.append("conceptId", concept.id);

      const res = await fetch("/api/concepts", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.code ?? res.status}: ${data.error ?? "failed"}`);
      setResults((prev) => [data as Generated, ...prev.filter((r) => r.conceptId !== concept.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setRunning(null);
    }
  }

  const spent = results.reduce((n, r) => n + r.unitsSpent, 0);

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <StudioHeader eyebrow="Concepts" title="Prewedding concepts">
        See the shoot before booking a photographer, a location and a wardrobe.
      </StudioHeader>

      {/* This warning is not decoration. The output is a synthesised
          photograph, not the couple's photo, and saying so plainly is the
          difference between a useful tool and a misleading one. */}
      <p className="mt-4 rounded-lg border border-prep/40 bg-prep-tint p-3 text-xs text-prep">
        <strong>Every image on this page is AI-generated.</strong> This is not your
        photograph — the location, the clothes and the pose are all invented to convey
        a concept, and even the face is only an approximation. Use it to brief a
        photographer, not as a finished result.
      </p>

      <section className="mt-5">
        <label className="block text-sm font-medium">Photo</label>
        <input
          type="file"
          accept="image/*"
          className="mt-2 w-full text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo" className="mt-3 w-32 rounded-lg" />
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">
          Choose a concept{" "}
          <span className="font-normal text-ink-faint">
            — {unitsPerConcept} units each
          </span>
        </h2>
        <div className="mt-2 space-y-2">
          {concepts.map((c) => {
            const done = results.find((r) => r.conceptId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!photo || !!running}
                onClick={() => generate(c)}
                className="w-full rounded-lg border border-line-strong p-3 text-left disabled:opacity-40"
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-[10px] text-ink-faint">
                    {running === c.id
                      ? `${(elapsed / 1000).toFixed(1)}s…`
                      : done
                        ? done.source === "fixture" ? "cached" : "done"
                        : c.verified ? "tested" : "untested"}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-ink-faint">{c.blurb}</span>
              </button>
            );
          })}
        </div>
        {running && (
          <p className="mt-2 text-center text-xs text-ink-faint">
            A generative scene takes 11–16 seconds, longer than an ordinary try-on.
            Do not refresh — an abandoned task is still billed.
          </p>
        )}
      </section>

      {error && <p className="mt-4 rounded-lg bg-late-tint p-3 text-sm text-late">{error}</p>}

      {results.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium">
            Results{" "}
            <span className="font-normal text-ink-faint">
              — {spent} units spent this session
            </span>
          </h2>
          <div className="mt-2 space-y-4">
            {results.map((r) => (
              <figure key={r.conceptId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt={r.label} className="w-full rounded-lg" />
                <figcaption className="mt-1 flex justify-between text-xs text-ink-faint">
                  <span>{r.label} · AI-generated</span>
                  <span>
                    {r.source === "fixture"
                      ? "from cache, 0 units"
                      : `${((r.pollMs ?? 0) / 1000).toFixed(1)}s · ${r.unitsSpent} units`}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
