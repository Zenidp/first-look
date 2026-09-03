import Image from "next/image";

import Container from "@/components/shared/container";
import { REFERENCE_LIBRARY, referencePath } from "@/lib/references";

/**
 * Deep feature, block one: the localisation.
 *
 * Not a marketing claim — a constraint that was measured. Perfect Corp's own
 * bridal catalogue is three wedding looks and four gowns, all Western, with no
 * kebaya anywhere in it. Everything Indonesian in this product goes through the
 * custom-reference path instead, and the garment strip below is that library,
 * read from the same file the look builder reads.
 */
const GARMENTS = REFERENCE_LIBRARY.filter(
  (item) => item.use === "clothes" && !item.groom,
);
const GROOM_GARMENTS = REFERENCE_LIBRARY.filter(
  (item) => item.use === "clothes" && item.groom,
);

export default function Nusantara() {
  return (
    <section id="nusantara" className="scroll-mt-24 border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
              The built-in catalogue does not contain a single kebaya.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              That is an audit result, not a guess: three bridal looks and four
              gowns, all Western. For a market that marries in kebaya, songket and
              ulos, the catalogue is empty.
            </p>
            <p className="mt-4 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              So the regional garments and makeup do not come from a catalogue at
              all. Both enter through our own reference images — and Indonesia is
              read as several aesthetics rather than one. Paes ageng from Yogyakarta,
              the Sundanese siger and Minang suntiang are different silhouettes,
              different headpieces and different makeup entirely.
            </p>
            <p className="mt-4 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              And a wedding has two people in it. The groom has his own path —
              beskap, haircut and beard, stacked onto his photo in the same order.
              The same batik parang runs through her kebaya and his beskap, because
              that is how a Javanese couple actually dresses.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                { heading: "Bride", items: GARMENTS },
                { heading: "Groom", items: GROOM_GARMENTS },
              ].map((column) => (
                <div key={column.heading}>
                  <h3 className="text-step--2 font-medium tracking-wide text-ink">
                    {column.heading}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {column.items.map((garment) => (
                      <li key={garment.id} className="flex items-baseline gap-2">
                        <span
                          aria-hidden="true"
                          className="size-1 shrink-0 rounded-full bg-gold"
                        />
                        <span className="text-step--1 text-ink-soft">
                          {garment.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/*
           * Both of them, side by side, because a wedding has two people in it
           * and a library that only dresses one is only half a product. Same
           * batik parang runs through her kebaya and his beskap — which is what
           * a Javanese couple actually wears, and something a Western catalogue
           * cannot express at all.
           */}
          <figure className="m-0">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface shadow-frame">
                <Image
                  src="/fixtures/8ff00575b06c290b8e205605f22c4d41.jpg"
                  alt="A full-body try-on on the bride: a long-sleeved ivory lace kebaya over a brown batik parang wrap."
                  fill
                  sizes="(min-width: 1024px) 15rem, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface shadow-frame">
                <Image
                  src="/fixtures/ef2a0bf1203c6cc46842d69bf1706914.jpg"
                  alt="A full-body try-on on the groom: a deep navy velvet beskap over the same batik parang wrap."
                  fill
                  sizes="(min-width: 1024px) 15rem, 45vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
              {[...GARMENTS.slice(0, 2), ...GROOM_GARMENTS.slice(0, 2)].map((garment) => (
                <div key={garment.id}>
                  <div className="relative aspect-3/4 overflow-hidden rounded-card border border-line bg-surface">
                    <Image
                      src={referencePath(garment.id)}
                      alt=""
                      fill
                      sizes="8rem"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-1.5 text-step--2 leading-4 text-ink-faint">
                    {garment.region}
                  </p>
                </div>
              ))}
            </div>

            <figcaption className="mt-4 text-step--2 leading-5 text-ink-faint">
              The garment references above are synthetic images made for this
              project, not real designers’ work. The two photographs beside them are
              genuine API output.
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
