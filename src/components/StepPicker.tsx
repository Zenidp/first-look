"use client";

import { useEffect, useRef, useState } from "react";

import type { Slot } from "@/lib/look-rules";

/**
 * One slot of the look: pick a catalogue template, or an item from the
 * Nusantara reference library.
 *
 * Both sources already exist and are free to list — `/api/templates/<feature>`
 * walks Perfect Corp's catalogue at 0 units, `/api/references` returns our own
 * library with its `use` field already naming the feature each item belongs to.
 * The catalogue is only fetched when a slot is opened: hair alone is 116 items
 * and makeup 349, and most brides will not open every slot.
 */

export type Choice = { id: string; label: string; thumb?: string };

type Template = { id: string; thumb: string; title: string; category_name: string };
type RefItem = { id: string; label: string; region: string; use: string; url: string };

type Props = {
  slot: Slot;
  value?: Choice;
  onChange: (choice: Choice | undefined) => void;
  /** Rendered under the row — a rule warning, when there is one. */
  warning?: string;
};

export default function StepPicker({ slot, value, onChange, warning }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  // Whether the catalogue has landed. Loading is derived from it rather than
  // being its own state, which keeps every setState in this component inside a
  // promise callback instead of the effect body.
  const [fetched, setFetched] = useState(false);
  const inFlight = useRef(false);

  // Fetch on first open only. Both endpoints cost 0 units, but hair alone is
  // 116 items and makeup 349, so there is no reason to pull them until asked.
  useEffect(() => {
    if (!open || fetched || inFlight.current) return;
    inFlight.current = true;

    let cancelled = false;
    const url =
      slot.source === "template" ? `/api/templates/${slot.feature}?all=1` : "/api/references";

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (slot.source === "template") setTemplates(d.templates ?? []);
        else setRefs((d.ready ?? []).filter((r: RefItem) => r.use === slot.feature));
        setError("");
        setFetched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Katalognya gagal dimuat.");
        setFetched(true);
      })
      .finally(() => {
        inFlight.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetched, slot.source, slot.feature]);

  const loading = open && !fetched;

  const categories = ["All", ...new Set(templates.map((t) => t.category_name))];
  const shown = category === "All" ? templates : templates.filter((t) => t.category_name === category);

  function choose(c: Choice) {
    onChange(c);
    setOpen(false);
  }

  return (
    <div className="border-b border-zinc-200 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {value?.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.thumb}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md border border-zinc-200 object-cover"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-zinc-300" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">{slot.label}</p>
          <p className="truncate text-xs text-zinc-500">
            {value ? value.label : slot.optional ? "Belum dipilih (boleh dilewati)" : "Wajib dipilih"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {value && (
            <button
              onClick={() => onChange(undefined)}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
            >
              Hapus
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {open ? "Tutup" : value ? "Ganti" : "Pilih"}
          </button>
        </div>
      </div>

      {slot.hint && !open && (
        <p className="mt-1.5 pl-15 text-[11px] leading-4 text-zinc-400">{slot.hint}</p>
      )}

      {warning && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-900">
          {warning}
        </p>
      )}

      {open && (
        <div className="mt-3">
          {loading && <p className="text-xs text-zinc-500">Memuat katalog…</p>}
          {error && <p className="text-xs text-rose-700">{error}</p>}

          {slot.source === "template" && templates.length > 0 && (
            <>
              {categories.length > 2 && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {shown.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => choose({ id: t.id, label: t.title, thumb: t.thumb })}
                    className={`overflow-hidden rounded-lg border-2 text-left ${
                      value?.id === t.id ? "border-rose-700" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.thumb}
                      alt={t.title}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block px-1 py-1 text-[10px] leading-tight text-zinc-700">
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {slot.source === "reference" && refs.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {refs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => choose({ id: r.id, label: r.label, thumb: r.url })}
                  className={`overflow-hidden rounded-lg border-2 text-left ${
                    value?.id === r.id ? "border-rose-700" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={r.label} loading="lazy" className="aspect-3/4 w-full object-cover" />
                  <span className="block px-1 py-1 text-[10px] leading-tight text-zinc-700">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && slot.source === "reference" && refs.length === 0 && (
            <p className="text-xs text-zinc-500">
              Belum ada pilihan untuk slot ini di pustaka referensi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
