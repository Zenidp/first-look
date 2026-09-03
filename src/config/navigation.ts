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
    label: "Build the look",
    blurb: "Makeup, hair, garment and jewellery on one photo.",
    sitemap: { priority: 0.9, changeFrequency: "weekly" },
  },
  {
    href: "/readiness",
    label: "Hair readiness",
    blurb: "Whether her hair can reach that style by the wedding day.",
    sitemap: { priority: 0.9, changeFrequency: "weekly" },
  },
  {
    href: "/prewedding",
    label: "Prewedding concepts",
    blurb: "See the shoot before booking a photographer and a location.",
    sitemap: { priority: 0.6, changeFrequency: "monthly" },
  },
];

/** The one action the header offers. Everything else in it is a link. */
export const headerCta: NavItem = {
  href: "/look",
  label: "Start a look",
};

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Studio",
    items: primaryNav,
  },
  {
    heading: "How it works",
    items: [
      { href: "/#how-it-works", label: "Three steps" },
      { href: "/#nusantara", label: "The Nusantara library" },
      { href: "/#readiness", label: "Why hair comes first" },
      { href: "/#faq", label: "Questions" },
    ],
  },
  {
    heading: "For makeup artists",
    items: [
      { href: "/#who-pays", label: "Who pays, and why" },
      { href: "/look", label: "Send a board to a client" },
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
