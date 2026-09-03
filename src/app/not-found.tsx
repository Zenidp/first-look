import Link from "next/link";

import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import Container from "@/components/shared/container";
import { primaryNav } from "@/config/navigation";

/**
 * 404.
 *
 * A useful one: it says what happened in a sentence and then offers every
 * screen the site actually has. An empty "page not found" makes the visitor do
 * the recovery work themselves, and most of them just leave instead.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="konten">
        <Container width="narrow" className="py-20 sm:py-28">
          <p className="text-step--2 font-medium tracking-[0.18em] text-accent uppercase">
            404
          </p>
          <h1 className="mt-4 font-display text-step-3 leading-tight font-normal text-ink">
            Halaman itu tidak ada.
          </h1>
          <p className="mt-4 max-w-prose text-step-0 leading-relaxed text-ink-soft">
            Mungkin tautannya salah ketik, atau halamannya pernah ada dan sekarang
            tidak. Semua yang ada di situs ini muat dalam daftar di bawah.
          </p>

          <ul className="mt-10 border-t border-line">
            {primaryNav.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} className="block py-5 no-underline">
                  <span className="font-display text-step-1 text-ink">
                    {item.label}
                  </span>
                  {item.blurb && (
                    <span className="mt-1 block text-step--1 text-ink-faint">
                      {item.blurb}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center rounded-control bg-ink px-6 text-step-0 font-medium text-paper no-underline transition-colors hover:bg-accent"
          >
            Kembali ke beranda
          </Link>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
