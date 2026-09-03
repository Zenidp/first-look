import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

/**
 * The look builder is a Client Component, and metadata can only be exported
 * from a Server Component — so it lives in this thin layout. That is also where
 * the breadcrumb belongs, since this page sits one level below the root.
 */
export const metadata = pageMetadata({
  title: "Susun look pengantin",
  description:
    "Tumpuk kebaya, sanggul, makeup, kalung dan anting ke satu foto wajahnya sendiri, " +
    "lalu jadikan video lima detik. Bisa dicoba gratis dengan foto contoh.",
  path: "/look",
});

export default function LookLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Beranda", path: "/" },
          { name: "Susun look", path: "/look" },
        ])}
      />
    </>
  );
}
