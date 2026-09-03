import type { ReactNode } from "react";

import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

/**
 * Public shell: full header, full footer.
 *
 * A Server Component. The only JavaScript this layout contributes is the
 * header's, which needs it for the scroll state and the drawer.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
