import Image from "next/image";
import Link from "next/link";

import Container from "@/components/shared/container";
import { site } from "@/config/site";

/**
 * Hero.
 *
 * The one bold moment on this page, and it is the product rather than a
 * decoration: her own photograph on the left, the same photograph carrying a
 * finished bridal look on the right. Same face, same crop, same grey wall.
 * That is the entire argument, and it is made before a word is read.
 *
 * Both images are real, paid outputs of the try-on chain — not mockups — which
 * is why the pair is worth the bytes it costs.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* A single soft wash behind the images, anchored to them rather than
          sprayed across the section. Without it the two photographs float. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-[38rem] w-[38rem] translate-x-1/3 -translate-y-1/4 rounded-full bg-accent-tint blur-3xl"
      />

      <Container width="wide" className="relative py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="max-w-xl">
            <h1 className="font-display text-step-4 leading-[1.02] font-normal tracking-tight text-ink">
              See the wedding look before you pay for the trial.
            </h1>

            <p className="mt-6 max-w-prose text-step-1 leading-relaxed text-ink-soft">
              A bridal trial costs {site.trialCost} and half a day, and it
              regularly ends in a look the bride does not want. Settle it here
              first: makeup, sanggul, kebaya and jewellery, stacked onto one
              photograph of her own face.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/look"
                className="inline-flex min-h-12 items-center rounded-control bg-ink px-6 text-step-0 font-medium text-paper no-underline transition-colors hover:bg-accent"
              >
                Start a look
              </Link>
              <Link
                href="/readiness"
                className="inline-flex min-h-12 items-center rounded-control border border-line-strong px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-surface"
              >
                Check hair readiness
              </Link>
            </div>

            <p className="mt-5 text-step--1 text-ink-faint">
              Free to try with the sample photo. No account.
            </p>
          </div>

          <figure className="m-0">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface">
                <Image
                  src="/demo/half-body.jpg"
                  alt="The bride before anything is applied: a plain t-shirt, hair combed back, grey studio wall."
                  fill
                  sizes="(min-width: 1024px) 22rem, 45vw"
                  className="object-cover"
                  priority
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-step--2 font-medium text-ink">
                  Her photo
                </span>
              </div>

              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface shadow-frame">
                <Image
                  src="/fixtures/c12e0cb5a8dd4861554ab98e28375c25.jpg"
                  alt="The same photograph after five try-ons: an ivory lace kebaya, a sanggul, bridal makeup, a gold collar necklace and drop earrings."
                  fill
                  sizes="(min-width: 1024px) 22rem, 45vw"
                  className="object-cover"
                  priority
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-step--2 font-medium text-paper">
                  Five layers later
                </span>
              </div>
            </div>

            <figcaption className="mt-4 flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-px w-8 shrink-0 rule-gold" />
              <span className="text-step--1 leading-6 text-ink-faint">
                Kebaya, sanggul, makeup, necklace and earrings applied in sequence
                to the same frame. The result is one photograph, not a collage —
                the face, the light and the crop stay hers.
              </span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
