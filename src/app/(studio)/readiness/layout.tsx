import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Bridal hair readiness",
  description:
    "Hair length, type and condition are read from a photo, then weighed against the " +
    "target style and the wedding date. Three verdicts, alternatives, and a month-by-month plan.",
  path: "/readiness",
});

export default function ReadinessLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Hair readiness", path: "/readiness" },
        ])}
      />
    </>
  );
}
