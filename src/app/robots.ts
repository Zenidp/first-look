import type { MetadataRoute } from "next";

import { disallowedPaths } from "@/config/navigation";
import { site } from "@/config/site";

/**
 * robots.txt.
 *
 * /api is disallowed because every route under it is a billed side effect, not
 * a document. /test is the internal feature harness — it works, and it is not
 * something a search result should ever land a stranger on.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
