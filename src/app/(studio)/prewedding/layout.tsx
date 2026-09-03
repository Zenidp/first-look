import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Konsep prewedding",
  description:
    "Lihat konsep pemotretan prewedding sebelum memesan fotografer, lokasi dan wardrobe. " +
    "Setiap gambar di halaman ini dibuat AI dan diberi label sebagai bahan diskusi.",
  path: "/prewedding",
});

export default function PreweddingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Beranda", path: "/" },
          { name: "Konsep prewedding", path: "/prewedding" },
        ])}
      />
    </>
  );
}
