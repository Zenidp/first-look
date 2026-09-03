import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

/**
 * The look builder is a Client Component, and metadata can only be exported
 * from a Server Component — so it lives in this thin layout. That is also where
 * the breadcrumb belongs, since this page sits one level below the root.
 */
export const metadata = pageMetadata({
  title: "Build a bridal look",
  description:
    "Stack kebaya, sanggul, makeup, necklace and earrings onto one photo of her own " +
    "face, then animate it into five seconds. Free to try with the sample photo.",
  path: "/look",
});

export default function LookLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Build the look", path: "/look" },
        ])}
      />
    </>
  );
}
