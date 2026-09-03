import type { ReactNode } from "react";

import JsonLd from "@/components/shared/json-ld";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Prewedding concepts",
  description:
    "See prewedding shoot concepts before booking a photographer, a location and a " +
    "wardrobe. Every image here is AI-generated and labelled as a discussion aid.",
  path: "/prewedding",
});

export default function PreweddingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Prewedding concepts", path: "/prewedding" },
        ])}
      />
    </>
  );
}
