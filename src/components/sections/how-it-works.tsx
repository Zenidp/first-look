import Container from "@/components/shared/container";

/**
 * Three steps.
 *
 * The only place on this page where numbering carries meaning, because the
 * order is genuinely load-bearing: the photograph has to exist before anything
 * can be stacked on it, and the stack has to exist before there is anything to
 * send. Numbering anything else here would be decoration.
 */
const STEPS = [
  {
    title: "One photo, guided",
    body:
      "Waist-up, facing the camera. The crop guide defines how large her face sits in " +
      "the frame, so the photo clears the engine's requirements before anything is " +
      "uploaded — and nothing is spent on a picture that would be rejected.",
  },
  {
    title: "Stack the look",
    body:
      "Garment, hair, makeup, necklace, earrings. Each choice runs against the previous " +
      "result rather than the original, so what comes out is one whole photograph. " +
      "Combinations that are known to fail are refused on screen, not after payment.",
  },
  {
    title: "Check it, then send it",
    body:
      "Animate it into five seconds to see how the fabric falls, check her hair against " +
      "the wedding date, then send a single look board to her makeup artist.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-b border-line bg-surface">
      <Container width="wide" className="py-16 sm:py-24">
        <h2 className="max-w-2xl font-display text-step-3 leading-tight font-normal text-ink">
          Three steps, before the first rupiah is spent.
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-line-strong text-step--1 font-medium text-ink tabular-nums">
                  {index + 1}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </div>
              <h3 className="mt-4 font-display text-step-1 leading-snug text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-step--1 leading-6 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
