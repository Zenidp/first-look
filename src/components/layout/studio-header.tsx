import type { ReactNode } from "react";

/**
 * The heading block every studio screen opens with.
 *
 * One component rather than three near-identical copies, because the thing that
 * makes a set of tool screens feel built by one hand is that their first
 * hundred pixels are identical. The eyebrow, the display heading and the
 * standfirst always sit in the same place at the same size.
 */
export default function StudioHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10">
      <p className="text-step--2 font-medium tracking-[0.18em] text-accent uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-step-3 leading-tight font-normal text-ink">
        {title}
      </h1>
      {children && (
        <div className="mt-4 max-w-prose text-step-0 leading-relaxed text-ink-soft">
          {children}
        </div>
      )}
      <hr className="mt-8 h-px border-0 bg-line" />
    </header>
  );
}
