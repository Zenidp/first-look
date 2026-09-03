"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Note the prop name: Next.js 16 renamed `reset` to `retry`. The older name
 * still type-checks as an unused extra prop and then silently does nothing,
 * which is the worst possible failure for a recovery button.
 *
 * The copy matters here more than usual. Some of what this app does costs money
 * per attempt, so a crash mid-run has to say plainly what happened to the work
 * already done instead of leaving the reader to guess whether retrying will
 * charge them twice.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-20"
    >
      <p className="text-step--2 font-medium tracking-[0.18em] text-accent uppercase">
        Something broke
      </p>
      <h1 className="mt-4 font-display text-step-3 leading-tight font-normal text-ink">
        This page stopped halfway.
      </h1>
      <p className="mt-4 text-step-0 leading-relaxed text-ink-soft">
        This is on us, not on your photo. Any layers of the look that finished
        before this are not lost, and retrying does not re-run the steps that
        already succeeded.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-12 items-center rounded-control bg-ink px-6 text-step-0 font-medium text-paper transition-colors hover:bg-accent"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-control border border-line-strong px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-surface"
        >
          Back to the home page
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-step--2 text-ink-faint">
          Incident code: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
