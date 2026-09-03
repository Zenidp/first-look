import Container from "@/components/shared/container";

/**
 * The last objections, answered.
 *
 * Exported as data so app/(marketing)/page.tsx can pass the identical strings
 * to the FAQPage JSON-LD. Structured data that disagrees with the visible text
 * is a manual-action risk, and the only reliable way to keep them in step is
 * for there to be one copy.
 *
 * Built on <details>/<summary>: keyboard operable, screen-reader announced and
 * expandable before hydration, with no accordion library and no client
 * component behind it.
 */
export const FAQ_ITEMS = [
  {
    q: "Is it really her face, or a model's?",
    a:
      "Hers. Every choice runs against her own photo, and each step's output becomes the " +
      "next step's input, so what comes out is one picture with the same face, the same " +
      "background and the same crop. The exception is the prewedding concept page, which " +
      "deliberately invents a new scene and labels every image as AI-generated.",
  },
  {
    q: "Does this replace the trial?",
    a:
      "No. It moves the agreement about the look to before the trial. Skin texture, how " +
      "makeup holds over a long day, and how fabric moves when she does can only be tested " +
      "in person. What disappears is the trial that starts with no agreed direction.",
  },
  {
    q: "What kind of photo does it need?",
    a:
      "Waist-up, facing the camera, shoulders visible, one face only, even light. The app " +
      "guides the crop before anything is uploaded, so a photo the engine would reject is " +
      "caught first, at no cost.",
  },
  {
    q: "Why does hair have to be down for the readiness check?",
    a:
      "Because the diagnostic answers about the photograph, not about the person. Measured " +
      "on the same model: hair in a bun reads a full band straighter than the same hair worn " +
      "loose. A verdict that changes with how she happened to tie her hair that morning is " +
      "not a verdict.",
  },
  {
    q: "Does it work for a bride in hijab?",
    a:
      "Yes. The garment library includes two hijab looks — a modern hijab kebaya and an " +
      "Acehnese gaun syar'i — and both run through the same garment try-on path as every " +
      "other kebaya.",
  },
  {
    q: "Is there a groom's version?",
    a:
      "Yes, and it is a first-class path rather than a variation. Beskap, haircut and beard " +
      "stack onto his photo in the same order, with four regional groom garments from Java, " +
      "Sunda and Minang plus a modern suit.",
  },
  {
    q: "Are photos stored?",
    a:
      "There are no accounts and no gallery. A photo is uploaded to be processed, and the " +
      "result is cached so the same look is never billed twice. Files on the API provider's " +
      "side expire on their own schedule.",
  },
  {
    q: "Why does some of it take a few seconds?",
    a:
      "Because the calls are real. One try-on layer averages 7.4 seconds and a five-second " +
      "video clip takes about a minute. A look that has been built before appears instantly " +
      "from cache.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-b border-line bg-surface">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
            The questions that usually come up.
          </h2>

          <div className="border-t border-line">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group border-b border-line [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-step-0 font-medium text-ink">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="mt-1.5 flex size-5 shrink-0 items-center justify-center"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="size-4 text-ink-faint transition-transform group-open:rotate-45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-prose pb-6 text-step--1 leading-6 text-ink-soft">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
