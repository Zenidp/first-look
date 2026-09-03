import Link from "next/link";

import Container from "@/components/shared/container";

/**
 * Deep feature, block two — and the reason this project exists.
 *
 * Everyone points try-on at "what would this look like?". This points hair
 * diagnostics at "can her hair actually get there by the wedding?", which is a
 * planning question, not a retail one.
 *
 * This is the page's dark section. One per page, placed here on purpose: it is
 * the beat the reader is supposed to slow down for, and nine identical light
 * sections in a row is what makes a long page feel endless.
 *
 * The three verdicts below are the real outputs of src/lib/readiness.ts, and
 * the same measured bride produces all three depending on her date and her
 * target. Nothing here is a mock-up of a feature that does not run.
 */
const VERDICTS = [
  {
    label: "Ready",
    tone: "ready",
    example: "Sanggul, 12 months out",
    body: "Length and texture already meet what that style needs, today.",
  },
  {
    label: "Ready with preparation",
    tone: "prep",
    example: "Long and loose, 12 months out",
    body: "Short of length, but there is time — with a month-by-month plan.",
  },
  {
    label: "Not by then",
    tone: "late",
    example: "Long and loose, 6 months out",
    body: "The gap does not close by that date. Alternatives are offered, with the numbers.",
  },
] as const;

const TONE_CLASS = {
  ready: "border-l-4 border-l-ready",
  prep: "border-l-4 border-l-prep",
  late: "border-l-4 border-l-late",
} as const;

export default function ReadinessFeature() {
  return (
    <section id="readiness" className="scroll-mt-24 bg-night text-night-soft">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-step--2 font-medium tracking-[0.18em] text-gold uppercase">
              The question nobody asks
            </p>
            <h2 className="mt-4 font-display text-step-3 leading-tight font-normal text-paper">
              Not just whether it suits her. Whether her hair can get there in
               time.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed">
              Three diagnostics read her hair’s length, type and condition from a
              photo. Our own rule layer weighs those against the style she wants and
              the time left before the wedding, and answers with one of three
              verdicts.
            </p>
            <p className="mt-4 max-w-prose text-step-0 leading-relaxed">
              If the answer is no, she gets alternatives her current length already
              reaches, and a month-by-month plan. Every threshold that fired can be
              opened and read — a visible &ldquo;why&rdquo;, not a black box.
            </p>

            <Link
              href="/readiness"
              className="mt-8 inline-flex min-h-12 items-center rounded-control bg-paper px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-gold-tint"
            >
              Try it with the sample photo
            </Link>
          </div>

          <ul className="space-y-4 self-center">
            {VERDICTS.map((verdict) => (
              <li
                key={verdict.label}
                className={`rounded-card border border-night-line bg-white/4 p-5 ${TONE_CLASS[verdict.tone]}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-display text-step-1 text-paper">
                    {verdict.label}
                  </span>
                  <span className="text-step--2 tabular-nums">{verdict.example}</span>
                </div>
                <p className="mt-2 text-step--1 leading-6">{verdict.body}</p>
              </li>
            ))}
            <li className="pt-2 text-step--2 leading-5">
              Growth is estimated at an average 1.25 cm a month. The API returns a
              word, not a measurement, so treat the result as a range — and the page
              itself says so.
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
