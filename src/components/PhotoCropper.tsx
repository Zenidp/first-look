"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ASPECT,
  GUIDES,
  exportCrop,
  loadPhoto,
  validateCrop,
  type CropRect,
  type Framing,
  type LoadedPhoto,
} from "@/lib/photo";

/**
 * Guided crop.
 *
 * The image pans and zooms behind a fixed 3:4 frame rather than a drag-handle
 * box being dragged over the image — the same gesture as every phone photo
 * cropper, which matters because CONTEXT §7 says brides and MUAs are on phones.
 *
 * The overlay is the load-bearing part. There is no face detection in this
 * project and a wrong guess is a billed failure, so instead the guide *defines*
 * the face size: align to the oval and the face lands at ~184px in the exported
 * 768x1024, comfortably past the API's 128px minimum.
 */

type Props = {
  file: File;
  framing: Framing;
  onCancel: () => void;
  onDone: (file: File, preview: string) => void;
};

/** Screen transform: source pixel (0,0) sits at (tx,ty), scaled by `scale`. */
type View = { scale: number; tx: number; ty: number };

export default function PhotoCropper({ file, framing, onCancel, onDone }: Props) {
  const guide = GUIDES[framing];

  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(0);
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [objectUrl, setObjectUrl] = useState("");
  // null means "not touched yet" — the starting transform is derived during
  // render instead of being written by an effect, which keeps this off the
  // cascading-render path (same reasoning as the catalogue fetch in /test).
  const [moved, setMoved] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());

  const frameH = frameW / ASPECT;

  // --- load -----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let created = "";
    loadPhoto(file)
      .then((p) => {
        if (cancelled) return;
        created = URL.createObjectURL(file);
        setObjectUrl(created);
        setPhoto(p);
        setMoved(null);
        setError("");
      })
      .catch(
        () => !cancelled && setError("Gambar itu tidak bisa dibaca. Coba file jpg atau png."),
      );
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file]);

  // --- measure the frame ----------------------------------------------------
  // ResizeObserver fires once on observe, so it supplies the initial width too.
  // Measuring synchronously here as well would just be a second render.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [photo]);

  /** Smallest scale that still covers the frame — the image may never show gaps. */
  const minScale = useCallback(
    (p: LoadedPhoto) => Math.max(frameW / p.width, frameH / p.height),
    [frameW, frameH],
  );

  const clamp = useCallback(
    (p: LoadedPhoto, v: View): View => {
      const scale = Math.max(minScale(p), Math.min(v.scale, minScale(p) * 8));
      return {
        scale,
        tx: Math.min(0, Math.max(frameW - p.width * scale, v.tx)),
        ty: Math.min(0, Math.max(frameH - p.height * scale, v.ty)),
      };
    },
    [minScale, frameW, frameH],
  );

  // The transform actually in force: whatever she dragged to, or the centred
  // cover fit if she has not touched it. Memoised because zoomAbout closes over
  // it — a fresh object each render would rebuild that callback every time.
  const view: View | null = useMemo(() => {
    if (!photo || frameW === 0) return null;
    if (moved) return moved;
    const s = minScale(photo);
    return {
      scale: s,
      tx: (frameW - photo.width * s) / 2,
      ty: (frameH - photo.height * s) / 2,
    };
  }, [photo, moved, frameW, frameH, minScale]);

  // --- gestures -------------------------------------------------------------
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 1) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!photo || !view || !pinch.current.has(e.pointerId)) return;
    const prev = pinch.current.get(e.pointerId)!;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current.size >= 2) {
      // Two fingers: scale about the midpoint between them.
      const pts = [...pinch.current.values()];
      const now = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const before = Math.hypot(
        pts[0].x - (pts[1].x - (e.clientX - prev.x)),
        pts[0].y - (pts[1].y - (e.clientY - prev.y)),
      );
      if (before > 0) zoomAbout(now / before, frameW / 2, frameH / 2);
      return;
    }

    if (drag.current?.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setMoved(clamp(photo, { ...view, tx: view.tx + dx, ty: view.ty + dy }));
  }

  function onPointerUp(e: React.PointerEvent) {
    pinch.current.delete(e.pointerId);
    if (drag.current?.id === e.pointerId) drag.current = null;
  }

  /** Zoom keeping the given frame-relative point under the same source pixel. */
  const zoomAbout = useCallback(
    (factor: number, px: number, py: number) => {
      if (!photo || !view) return;
      const scale = view.scale * factor;
      setMoved(
        clamp(photo, {
          scale,
          tx: px - ((px - view.tx) / view.scale) * scale,
          ty: py - ((py - view.ty) / view.scale) * scale,
        }),
      );
    },
    [photo, view, clamp],
  );

  function onWheel(e: React.WheelEvent) {
    if (!photo || !view) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAbout(e.deltaY < 0 ? 1.08 : 1 / 1.08, e.clientX - rect.left, e.clientY - rect.top);
  }

  // --- result ---------------------------------------------------------------
  const crop: CropRect | null =
    photo && view
      ? {
          x: -view.tx / view.scale,
          y: -view.ty / view.scale,
          width: frameW / view.scale,
          height: frameH / view.scale,
        }
      : null;

  const check = photo && crop ? validateCrop(photo, crop) : null;

  async function confirm() {
    if (!photo || !crop || !check?.ok) return;
    setBusy(true);
    setError("");
    try {
      // Untouched only when the frame was never moved AND the file already met
      // the spec — that is the one case where forwarding the original bytes
      // keeps whatever fixture identity they had (FINDINGS §2e).
      const whole =
        Math.abs(crop.width - photo.width) < 2 && Math.abs(crop.height - photo.height) < 2;
      const out = await exportCrop(photo, crop, { untouched: moved === null && whole });
      onDone(out, URL.createObjectURL(out));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses foto.");
      setBusy(false);
    }
  }

  if (error && !photo) {
    return (
      <div className="rounded-lg border border-late/30 bg-late-tint p-4 text-sm text-late">
        <p>{error}</p>
        <button onClick={onCancel} className="mt-2 text-xs font-medium underline">
          Pilih foto lain
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">{guide.label}</p>
      <p className="mt-1 text-xs leading-5 text-ink-faint">{guide.hint}</p>

      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ height: frameH || undefined }}
        className="relative mt-3 w-full max-w-sm cursor-move touch-none overflow-hidden rounded-xl bg-surface-2 select-none"
      >
        {photo && view && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={objectUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: photo.width,
              height: photo.height,
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          />
        )}

        {/* The guide. Everything outside it is dimmed so the frame reads as the crop. */}
        <svg
          viewBox="0 0 100 133.33"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {guide.face && (
            <>
              <defs>
                <mask id="cut">
                  <rect width="100" height="133.33" fill="white" />
                  <ellipse
                    cx={guide.face.cx * 100}
                    cy={guide.face.cy * 133.33}
                    rx={guide.face.rx * 100}
                    ry={guide.face.ry * 133.33}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width="100" height="133.33" fill="rgba(0,0,0,0.28)" mask="url(#cut)" />
              <ellipse
                cx={guide.face.cx * 100}
                cy={guide.face.cy * 133.33}
                rx={guide.face.rx * 100}
                ry={guide.face.ry * 133.33}
                fill="none"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          {guide.lines?.map((l) => (
            <line
              key={l.label}
              x1="6"
              x2="94"
              y1={l.y * 133.33}
              y2={l.y * 133.33}
              stroke="white"
              strokeWidth="0.5"
              strokeDasharray="2 1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {guide.lines?.map((l) => (
          <span
            key={l.label}
            style={{ top: `${l.y * 100}%` }}
            className="pointer-events-none absolute left-2 -translate-y-1/2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-paper"
          >
            {l.label}
          </span>
        ))}
      </div>

      {/* Slider as well as pinch: a trackpad has no pinch and a phone has no wheel. */}
      <label className="mt-3 flex max-w-sm items-center gap-3 text-xs text-ink-faint">
        Perbesar
        <input
          type="range"
          min={100}
          max={400}
          value={photo && view ? Math.round((view.scale / minScale(photo)) * 100) : 100}
          onChange={(e) => {
            if (!photo || !view) return;
            const target = minScale(photo) * (Number(e.target.value) / 100);
            zoomAbout(target / view.scale, frameW / 2, frameH / 2);
          }}
          className="flex-1 accent-accent"
        />
      </label>

      {check && !check.ok && (
        <ul className="mt-3 max-w-sm space-y-1 rounded-lg border border-prep/30 bg-prep-tint p-3 text-xs leading-5 text-prep">
          {check.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && photo && (
        <p className="mt-3 max-w-sm rounded-lg border border-late/30 bg-late-tint p-3 text-xs text-late">
          {error}
        </p>
      )}

      <div className="mt-4 flex max-w-sm gap-2">
        <button
          onClick={confirm}
          disabled={!check?.ok || busy}
          className="flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          {busy ? "Memproses…" : "Pakai foto ini"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
