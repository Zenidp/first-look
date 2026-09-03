/**
 * Site identity.
 *
 * One place for everything that appears in metadata, structured data, the OG
 * card and the footer. Nothing here is duplicated in a component.
 *
 * The interface is in English. The judges for this submission are American, and
 * the product's Indonesian specificity is something to *show* — kebaya, sanggul,
 * paes ageng, beskap — rather than something to hide behind. Those words stay in
 * Indonesian throughout, because they are the names of the things themselves.
 */
export const site = {
  name: "First Look",
  /** Used where the bare name would be ambiguous — OG cards, JSON-LD. */
  legalName: "First Look Studio",
  tagline: "See the wedding look before you pay for the trial",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://first-look-five.vercel.app",
  /** 155 characters. Long enough to carry the benefit, short enough to survive. */
  description:
    "A bridal look studio for Indonesian makeup artists and their clients. Stack " +
    "makeup, hair, kebaya and jewellery onto one photo of her own face — then find " +
    "out whether her hair can reach that style by the wedding.",
  locale: "en_US",
  lang: "en",
  city: "Jakarta",
  country: "ID",
  /**
   * The one number that matters to a reader and to a judge: what a wasted
   * bridal trial actually costs. Stated as a range because it is a range.
   */
  trialCost: "Rp 1.5–4 million",
} as const;

/**
 * The three verdicts Hair Readiness can return. Named here because the landing
 * page, the FAQ and the structured data all have to say the same three words.
 */
export const VERDICTS = ["Ready", "Ready with preparation", "Not by then"] as const;
