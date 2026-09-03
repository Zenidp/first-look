/**
 * The single source of navigation.
 *
 * The header, the mobile drawer, the footer and app/sitemap.ts all read this
 * file. That is the whole point: a route added here appears in every one of
 * them at once, and a route that exists but is not listed here cannot be
 * silently orphaned in the sitemap.
 */

export type NavItem = {
  href: string;
  label: string;
  /** One line, shown in the footer and the mobile drawer. */
  blurb?: string;
  /** Whether it belongs in sitemap.xml, and at what weight. */
  sitemap?: { priority: number; changeFrequency: "daily" | "weekly" | "monthly" };
};

/** Top-level links. Five is the ceiling; past that people stop reading and guess. */
export const primaryNav: NavItem[] = [
  {
    href: "/look",
    label: "Susun look",
    blurb: "Makeup, sanggul, busana dan perhiasan di satu foto.",
    sitemap: { priority: 0.9, changeFrequency: "weekly" },
  },
  {
    href: "/readiness",
    label: "Kesiapan rambut",
    blurb: "Apakah rambutnya bisa sampai ke gaya itu pada hari H.",
    sitemap: { priority: 0.9, changeFrequency: "weekly" },
  },
  {
    href: "/prewedding",
    label: "Konsep prewedding",
    blurb: "Konsep pemotretan sebelum memesan fotografer dan lokasi.",
    sitemap: { priority: 0.6, changeFrequency: "monthly" },
  },
];

/** The one action the header offers. Everything else in it is a link. */
export const headerCta: NavItem = {
  href: "/look",
  label: "Mulai susun look",
};

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Studio",
    items: primaryNav,
  },
  {
    heading: "Cara kerjanya",
    items: [
      { href: "/#cara-kerja", label: "Tiga langkah" },
      { href: "/#nusantara", label: "Pustaka Nusantara" },
      { href: "/#kesiapan", label: "Kenapa rambut lebih dulu" },
      { href: "/#tanya", label: "Pertanyaan umum" },
    ],
  },
  {
    heading: "Untuk juru rias",
    items: [
      { href: "/#untuk-mua", label: "Siapa yang membayar" },
      { href: "/look", label: "Kirim ke klien" },
    ],
  },
];

/** Routes that exist but must never be indexed. Read by app/robots.ts. */
export const disallowedPaths = ["/api/", "/test"];

/** Every indexable route, derived rather than restated. Read by app/sitemap.ts. */
export function indexableRoutes(): Required<Pick<NavItem, "href" | "sitemap">>[] {
  const home = {
    href: "/",
    sitemap: { priority: 1, changeFrequency: "weekly" as const },
  };
  const rest = primaryNav
    .filter((item): item is NavItem & { sitemap: NonNullable<NavItem["sitemap"]> } =>
      Boolean(item.sitemap),
    )
    .map((item) => ({ href: item.href, sitemap: item.sitemap }));
  return [home, ...rest];
}
