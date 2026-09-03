import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import JsonLd from "@/components/shared/json-ld";
import { site } from "@/config/site";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import "./globals.css";

/**
 * Two typefaces, and the difference between them is meant to be obvious.
 *
 * Fraunces is the display serif — warm, slightly wonky, the register a bridal
 * studio writes in. Plus Jakarta Sans carries every piece of interface text;
 * it was commissioned for the city this product is built in and for, and it is
 * a better Latin-with-Indonesian-diacritics face than the geometric sans it
 * replaces.
 *
 * Both are self-hosted by next/font, so there is no round trip to Google and
 * no flash of fallback text.
 */
const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  category: "beauty",
  keywords: [
    "look pengantin",
    "juru rias",
    "MUA pengantin",
    "trial makeup",
    "kebaya",
    "sanggul",
    "virtual try-on",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={site.lang}
      className={`${display.variable} ${sans.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        {/*
         * First focusable element on the page. Visually hidden until it has
         * focus, at which point it must be plainly visible — a skip link that
         * stays invisible when focused is worse than none, because a keyboard
         * user tabs into a control they cannot see.
         */}
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2.5 focus:text-step--1 focus:font-medium focus:text-paper"
        >
          Lewati ke konten
        </a>
        {children}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
      </body>
    </html>
  );
}
