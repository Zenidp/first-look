import type { ReactNode } from "react";

/**
 * The only place a horizontal boundary is defined.
 *
 * Sections declare their vertical rhythm and their background; none of them
 * restates a max-width or a gutter. `wide` exists for the two places that need
 * to break out — the hero pair and the reference strip.
 */
export default function Container({
  children,
  width = "default",
  className = "",
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
  className?: string;
}) {
  const max =
    width === "wide" ? "max-w-6xl" : width === "narrow" ? "max-w-2xl" : "max-w-5xl";
  return (
    <div className={`mx-auto w-full ${max} px-5 sm:px-8 ${className}`}>{children}</div>
  );
}
