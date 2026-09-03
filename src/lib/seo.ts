import type { Metadata } from "next";

import { site } from "@/config/site";

/**
 * Per-page metadata.
 *
 * Every page gets its own title, its own description and — the one that is
 * easiest to forget and most expensive to get wrong — its own canonical.
 */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: `${title} — ${site.name}`,
      description,
      siteName: site.name,
      locale: site.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${site.name}`,
      description,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Organization and WebSite belong at the root and describe the publisher.
 * Google reads them to decide what the site *is* before it ranks any page.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.legalName,
    alternateName: site.name,
    url: site.url,
    description: site.description,
    areaServed: { "@type": "Country", name: "Indonesia" },
    knowsLanguage: ["en", "id-ID"],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: "en-US",
    description: site.description,
    publisher: { "@id": `${site.url}/#organization` },
  };
}

/**
 * The product itself. `SoftwareApplication` rather than `Product` because
 * there is nothing to ship — and no `AggregateRating`, because inventing one
 * is the single fastest way to get structured data ignored entirely.
 */
export function applicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: site.url,
    description: site.description,
    inLanguage: "en-US",
    audience: {
      "@type": "Audience",
      audienceType: "Bridal makeup artists and their clients",
    },
    featureList: [
      "Stack makeup, hair, garment and jewellery try-ons onto one photo",
      "A Nusantara library of Indonesian bridal garments and regional makeup",
      "Hair readiness diagnosed against the wedding date",
      "A look board the bride can send to her makeup artist",
    ],
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: `${site.url}${step.path}`,
    })),
  };
}
