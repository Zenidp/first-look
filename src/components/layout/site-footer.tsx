import Link from "next/link";

import Container from "@/components/shared/container";
import Logo from "@/components/shared/logo";
import { footerNav } from "@/config/navigation";
import { site } from "@/config/site";

/**
 * Footer.
 *
 * A sitemap that a person can read and a crawler can follow, which is the
 * cheapest internal linking there is. Each column is its own labelled <nav>,
 * so a screen reader can skip a whole column rather than hearing every link.
 */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <Container width="wide" className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-step--1 leading-6 text-ink-faint">
              Studio look pengantin untuk juru rias dan kliennya. Dibuat di{" "}
              {site.city}.
            </p>
          </div>

          {footerNav.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-step--2 font-medium tracking-wide text-ink">
                {column.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {column.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-step--1 text-ink-soft no-underline hover:text-accent hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-step--2 text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. Prototipe, dibangun untuk
            DevNetwork [API + Cloud + AI] Hackathon 2026.
          </p>
          <p>
            Try-on, video dan diagnosa rambut berjalan di atas API Perfect Corp
            YouCam.
          </p>
        </div>

        <p className="mt-6 max-w-3xl text-step--2 leading-5 text-ink-faint">
          Semua wajah dan busana yang ditampilkan di situs ini adalah gambar
          sintetis yang dibuat untuk proyek ini. Tidak ada foto pengantin sungguhan
          dan tidak ada aset pihak ketiga yang dipakai. Hasil try-on adalah
          simulasi, bukan janji atas hasil rias di hari H.
        </p>
      </Container>
    </footer>
  );
}
