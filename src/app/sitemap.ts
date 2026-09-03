import type { MetadataRoute } from "next";

import { indexableRoutes } from "@/config/navigation";
import { site } from "@/config/site";

/**
 * Sitemap.
 *
 * Derived from config/navigation.ts rather than restated here, so a route can
 * never be added to the header and quietly left out of the sitemap. Routes with
 * no `sitemap` entry — /test, everything under /api — are absent by
 * construction rather than by remembering to exclude them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return indexableRoutes().map((route) => ({
    url: `${site.url}${route.href === "/" ? "" : route.href}`,
    lastModified,
    changeFrequency: route.sitemap.changeFrequency,
    priority: route.sitemap.priority,
  }));
}
