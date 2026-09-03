import Link from "next/link";

import Container from "@/components/shared/container";
import { headerCta } from "@/config/navigation";

/**
 * The closing ask.
 *
 * The same action as the hero, in the same words. Changing the wording here is
 * a common instinct and a mistake: a reader who scrolled the whole page is
 * being asked to recognise a decision, not to evaluate a new one.
 */
export default function FinalCta() {
  return (
    <section className="border-b border-line">
      <Container width="narrow" className="py-20 text-center sm:py-28">
        <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
          See the wedding look before you pay for the trial.
        </h2>
        <p className="mx-auto mt-5 max-w-prose text-step-0 leading-relaxed text-ink-soft">
          Start with the sample photo that is already there. No account, and
          nothing to upload before you can see how it works.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={headerCta.href}
            className="inline-flex min-h-12 items-center rounded-control bg-ink px-6 text-step-0 font-medium text-paper no-underline transition-colors hover:bg-accent"
          >
            {headerCta.label}
          </Link>
          <Link
            href="/readiness"
            className="inline-flex min-h-12 items-center rounded-control border border-line-strong px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-surface"
          >
            Check hair readiness
          </Link>
        </div>
      </Container>
    </section>
  );
}
