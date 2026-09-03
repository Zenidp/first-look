import Link from "next/link";

import { site } from "@/config/site";

/**
 * Wordmark.
 *
 * Drawn in type rather than shipped as an SVG: it is two words in the display
 * serif, and a raster or vector file would only be the same thing with a
 * network request and a layout shift in front of it.
 */
export default function Logo({ tone = "ink" }: { tone?: "ink" | "night" }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-baseline gap-2 no-underline"
      aria-label={`${site.name} — home`}
    >
      <span
        className={`font-display text-step-1 leading-none font-normal tracking-tight ${
          tone === "night" ? "text-paper" : "text-ink"
        }`}
      >
        First Look
      </span>
    </Link>
  );
}
