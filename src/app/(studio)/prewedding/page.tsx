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
      .catch(() => setError("Tidak bisa memuat daftar konsep."));
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
      setError("Foto tidak terbaca. Gunakan jpg atau png biasa.");
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
      if (!res.ok) throw new Error(`${data.code ?? res.status}: ${data.error ?? "gagal"}`);
      setResults((prev) => [data as Generated, ...prev.filter((r) => r.conceptId !== concept.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permintaan gagal");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setRunning(null);
    }
  }

  const spent = results.reduce((n, r) => n + r.unitsSpent, 0);

  return (
    <main id="konten" className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <StudioHeader eyebrow="Konsep" title="Konsep prewedding">
        Lihat konsep pemotretan sebelum memesan fotografer, lokasi, dan wardrobe.
      </StudioHeader>

      {/* This warning is not decoration. The output is a synthesised
          photograph, not the couple's photo, and saying so plainly is the
          difference between a useful tool and a misleading one. */}
      <p className="mt-4 rounded-lg border border-prep/40 bg-prep-tint p-3 text-xs text-prep">
        <strong>Semua gambar di halaman ini dibuat AI.</strong> Ini bukan fotomu —
        lokasi, busana, dan pose semuanya dikarang untuk menggambarkan konsep.
        Wajahnya pun hanya pendekatan. Pakai sebagai bahan diskusi dengan
        fotografer, bukan sebagai hasil akhir.
      </p>

      <section className="mt-5">
        <label className="block text-sm font-medium">Foto</label>
        <input
          type="file"
          accept="image/*"
          className="mt-2 w-full text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto terpilih" className="mt-3 w-32 rounded-lg" />
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">
          Pilih konsep{" "}
          <span className="font-normal text-ink-faint">
            — {unitsPerConcept} unit per konsep
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
                        ? done.source === "fixture" ? "tersimpan" : "selesai"
                        : c.verified ? "teruji" : "belum diuji"}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-ink-faint">{c.blurb}</span>
              </button>
            );
          })}
        </div>
        {running && (
          <p className="mt-2 text-center text-xs text-ink-faint">
            Adegan generatif butuh 11–16 detik, lebih lama dari try-on biasa. Jangan
            refresh — task yang ditinggalkan tetap ditagih.
          </p>
        )}
      </section>

      {error && <p className="mt-4 rounded-lg bg-late-tint p-3 text-sm text-late">{error}</p>}

      {results.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium">
            Hasil{" "}
            <span className="font-normal text-ink-faint">
              — {spent} unit terpakai sesi ini
            </span>
          </h2>
          <div className="mt-2 space-y-4">
            {results.map((r) => (
              <figure key={r.conceptId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt={r.label} className="w-full rounded-lg" />
                <figcaption className="mt-1 flex justify-between text-xs text-ink-faint">
                  <span>{r.label} · dibuat AI</span>
                  <span>
                    {r.source === "fixture"
                      ? "dari cache, 0 unit"
                      : `${((r.pollMs ?? 0) / 1000).toFixed(1)}s · ${r.unitsSpent} unit`}
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
