import Container from "@/components/shared/container";

/**
 * The problem, in the reader's language.
 *
 * Written from the bride's and the artist's side of the table — "a screenshot of
 * somebody else's face", not "reference mismatch". This is the section that
 * earns the right to describe a solution, so it names three specific failures
 * rather than gesturing at a category.
 */
const FAILURES = [
  {
    title: "The reference is somebody else's face",
    body:
      "She arrives with Pinterest screenshots. The artist is looking at different " +
      "features, a different eye shape and a different skin tone from the client in " +
      "front of her, and both of them hope it comes out close.",
  },
  {
    title: "Agreement happens in the makeup chair",
    body:
      "The first moment they both see the same thing is the trial — after the money " +
      "is spent, after half a day is gone, and at the point where changing direction " +
      "means starting over.",
  },
  {
    title: "Nobody checks the hair in time",
    body:
      "A sanggul that fails on the day is usually not a skill problem. It is length, " +
      "texture and condition, discovered at the trial with weeks left — when hair " +
      "grows about 1.25 cm a month and there is no way to make up the difference.",
  },
];

export default function Problem() {
  return (
    <section className="border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
              The trial is the wrong place to discover the look is wrong.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              This is not a question of taste. It is a question of order: the most
              expensive decision gets made last, on the least information.
            </p>
          </div>

          <ol className="space-y-8">
            {FAILURES.map((failure, index) => (
              <li key={failure.title} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="mt-1 shrink-0 font-display text-step-1 text-ink-faint tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-step-0 font-semibold text-ink">
                    {failure.title}
                  </h3>
                  <p className="mt-1.5 max-w-prose text-step--1 leading-6 text-ink-soft">
                    {failure.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
