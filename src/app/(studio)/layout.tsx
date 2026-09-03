import type { ReactNode } from "react";

import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

/**
 * The working screens.
 *
 * Same chrome as the marketing shell, deliberately. This is a tool a bride and
 * her rias use together on one phone, often mid-conversation, and dropping the
 * navigation the moment she starts working would strand her on whichever
 * screen she happened to open.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
