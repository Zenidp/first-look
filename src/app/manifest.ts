import type { MetadataRoute } from "next";

import { site } from "@/config/site";

/**
 * Web app manifest.
 *
 * Brides and juru rias are on phones, and a look board gets opened from a chat
 * app. `standalone` plus a warm background means a saved shortcut opens without
 * browser chrome and without a white flash against an ivory page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#fbf9f5",
    lang: site.lang,
    categories: ["lifestyle", "photo", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
