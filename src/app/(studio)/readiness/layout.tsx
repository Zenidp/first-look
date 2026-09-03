import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Kesiapan rambut pengantin",
  description:
    "Panjang, tipe dan kondisi rambut dibaca dari foto, lalu dibandingkan dengan gaya " +
    "yang diincar dan tanggal pernikahan. Tiga vonis, alternatif, dan rencana bulan per bulan.",
  path: "/readiness",
});

export default function ReadinessLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Beranda", path: "/" },
          { name: "Kesiapan rambut", path: "/readiness" },
        ])}
      />
    </>
  );
}
