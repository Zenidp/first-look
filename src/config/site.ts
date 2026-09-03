/**
 * Site identity.
 *
 * One place for everything that appears in metadata, structured data, the OG
 * card and the footer. Nothing here is duplicated in a component.
 */
export const site = {
  name: "First Look",
  /** Used where the bare name would be ambiguous — OG cards, JSON-LD. */
  legalName: "First Look Studio",
  tagline: "Lihat look pengantinmu sebelum bayar trial",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://first-look-five.vercel.app",
  /** 155 characters. Long enough to carry the benefit, short enough to survive. */
  description:
    "Studio look pengantin untuk juru rias dan kliennya. Susun makeup, sanggul, " +
    "kebaya dan perhiasan di satu foto wajahnya sendiri, lalu cek apakah rambutnya " +
    "siap pada hari H.",
  locale: "id_ID",
  lang: "id",
  city: "Jakarta",
  country: "ID",
  /**
   * The one number that matters to a reader and to a judge: what a wasted
   * bridal trial actually costs. Stated as a range because it is a range.
   */
  trialCost: "Rp 1,5–4 juta",
} as const;

/**
 * The three verdicts Hair Readiness can return. Named here because the landing
 * page, the FAQ and the structured data all have to say the same three words.
 */
export const VERDICTS = ["Siap", "Bisa dengan persiapan", "Belum sampai"] as const;
