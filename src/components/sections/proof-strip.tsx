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
    unit: "API terpasang",
    note: "Try-on, generatif dan diagnosa, semuanya versi terbaru.",
  },
  {
    figure: "5",
    unit: "lapis di satu foto",
    note: "Busana, rambut, makeup, kalung, anting — berurutan, satu frame.",
  },
  {
    figure: "13",
    unit: "referensi Nusantara",
    note: "8 busana daerah dan 5 makeup pengantin, tidak ada di katalog bawaan.",
  },
  {
    figure: "7,4 dtk",
    unit: "per lapisan, terukur",
    note: "Rata-rata satu panggilan try-on dari unggah sampai hasil.",
  },
];

export default function ProofStrip() {
  return (
    <section aria-label="Angka yang terukur" className="border-b border-line bg-surface">
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
