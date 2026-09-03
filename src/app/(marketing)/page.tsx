import Faq, { FAQ_ITEMS } from "@/components/sections/faq";
import FinalCta from "@/components/sections/final-cta";
import Hero from "@/components/sections/hero";
import HowItWorks from "@/components/sections/how-it-works";
import Nusantara from "@/components/sections/nusantara";
import Problem from "@/components/sections/problem";
import ProofStrip from "@/components/sections/proof-strip";
import ReadinessFeature from "@/components/sections/readiness-feature";
import WhoPays from "@/components/sections/who-pays";
import JsonLd from "@/components/shared/json-ld";
import { applicationSchema, faqSchema } from "@/lib/seo";

/**
 * Homepage.
 *
 * Not a stack of sections — one argument read top to bottom: here is the cost,
 * here is why it happens, here is the three-step alternative, here is the part
 * nobody else does, here is who pays, here are the objections, here is the ask.
 *
 * The rhythm alternates on purpose. Paper, then the raised surface, then paper,
 * then the single dark section at the differentiator, then back. Nine sections
 * with identical padding and identical backgrounds is what makes a long page
 * feel like scrolling without an end.
 *
 * No entrance animation anywhere. The bold moment is the before-and-after pair
 * in the hero, and if every section announced itself none of them would.
 */
export default function HomePage() {
  return (
    <main id="konten">
      <Hero />
      <ProofStrip />
      <Problem />
      <HowItWorks />
      <Nusantara />
      <ReadinessFeature />
      <WhoPays />
      <Faq />
      <FinalCta />

      <JsonLd data={applicationSchema()} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />
    </main>
  );
}
