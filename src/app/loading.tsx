/**
 * Route-level fallback.
 *
 * A skeleton with the same shape and the same reserved heights as the page it
 * stands in for, so the swap costs nothing in layout shift. A centred spinner
 * would move every element on arrival, which is precisely the CLS this is meant
 * to avoid.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8"
    >
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="grid gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="max-w-xl">
          <div className="h-[3.2rem] w-full rounded-card bg-surface-2" />
          <div className="mt-3 h-[3.2rem] w-4/5 rounded-card bg-surface-2" />
          <div className="mt-8 h-24 w-full rounded-card bg-surface" />
          <div className="mt-8 flex gap-3">
            <div className="h-12 w-44 rounded-control bg-surface-2" />
            <div className="h-12 w-44 rounded-control bg-surface" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="aspect-3/4 rounded-frame bg-surface" />
          <div className="aspect-3/4 rounded-frame bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
