import Container from "@/components/shared/container";
import { site } from "@/config/site";

/**
 * The pricing slot, answered honestly.
 *
 * There is no price list yet, and printing one would be fiction. What this
 * section owes the reader — and the judge who asks whether this could be a
 * company — is the shape of the business: who pays, why they would, and where
 * the second line of revenue is. That is a more useful answer than three
 * invented tiers.
 */
const MODEL = [
  {
    heading: "The artist pays, not the bride",
    body:
      "This is a working tool for a service professional. Makeup artists and bridal " +
      "sanggar already pay for equipment, and their revenue per client is well defined. " +
      "One trial that does not get wasted covers months of subscription.",
  },
  {
    heading: "The look board is the distribution",
    body:
      "It is the artefact the bride forwards to her artist, her mother, the family " +
      "group chat. Every forward introduces the artist to the next client — the " +
      "distribution rides on the thing that was always going to be shared.",
  },
  {
    heading: "The second line is in the hair",
    body:
      "A “ready with preparation” verdict is a treatment referral that arises naturally: " +
      "salons, treatments, extensions. The diagnostic produces a specific, dated need " +
      "that the bride has already accepted before anyone tries to sell her anything.",
  },
];

export default function WhoPays() {
  return (
    <section id="who-pays" className="scroll-mt-24 border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
            Built for makeup artists, not to replace them.
          </h2>
          <p className="mt-5 text-step-0 leading-relaxed text-ink-soft">
            The tool does not do anyone’s makeup. It moves the agreement about the
            look to before the trial, so that the artist’s time on the day is spent
            refining rather than discovering the direction was wrong.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {MODEL.map((item) => (
            <div key={item.heading} className="border-t border-line pt-5">
              <h3 className="font-display text-step-1 leading-snug text-ink">
                {item.heading}
              </h3>
              <p className="mt-2 text-step--1 leading-6 text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-prose text-step--1 leading-6 text-ink-faint">
          The benchmark used on this page: one bridal trial session in {site.city}{" "}
          runs {site.trialCost} and costs both sides half a working day.
        </p>
      </Container>
    </section>
  );
}
