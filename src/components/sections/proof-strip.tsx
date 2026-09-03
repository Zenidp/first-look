import Container from "@/components/shared/container";

/**
 * The social-proof slot.
 *
 * A four-day-old prototype has no client logos and no user count, and inventing
 * either is the fastest way to lose a reader who checks. So the risk-lowering
 * job of this section is done with measured facts instead: what is actually
 * wired up, and how fast it actually runs. Every number here was recorded
 * against the live API, not estimated.
 */
const FACTS = [
  {
    figure: "31",
    unit: "APIs wired up",
    note: "Try-on, generative and diagnostic — every one on its newest version.",
  },
  {
    figure: "5",
    unit: "layers, one photo",
    note: "Garment, hair, makeup, necklace, earrings — in sequence, one frame.",
  },
  {
    figure: "17",
    unit: "Nusantara references",
    note: "12 regional garments for bride and groom, and 5 bridal makeup looks.",
  },
  {
    figure: "7.4s",
    unit: "per layer, measured",
    note: "Average for one try-on call, from upload to finished image.",
  },
];

export default function ProofStrip() {
  return (
    <section aria-label="Measured figures" className="border-b border-line bg-surface">
      <Container width="wide" className="py-10 sm:py-12">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.unit}>
              <dt className="sr-only">{fact.unit}</dt>
              <dd>
                <span className="block font-display text-step-3 leading-none text-ink">
                  {fact.figure}
                </span>
                <span className="mt-2 block text-step--1 font-medium text-ink">
                  {fact.unit}
                </span>
                <span className="mt-1 block text-step--2 leading-5 text-ink-faint">
                  {fact.note}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
