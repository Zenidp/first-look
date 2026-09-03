import Image from "next/image";
import Link from "next/link";

import Container from "@/components/shared/container";
import { site } from "@/config/site";

/**
 * Hero.
 *
 * The one bold moment on this page, and it is the product rather than a
 * decoration: her own photograph on the left, the same photograph carrying a
 * finished bridal look on the right. Same face, same crop, same grey wall.
 * That is the entire argument, and it is made before a word is read.
 *
 * Both images are real, paid outputs of the try-on chain — not mockups — which
 * is why the pair is worth the bytes it costs.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* A single soft wash behind the images, anchored to them rather than
          sprayed across the section. Without it the two photographs float. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-[38rem] w-[38rem] translate-x-1/3 -translate-y-1/4 rounded-full bg-accent-tint blur-3xl"
      />

      <Container width="wide" className="relative py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="max-w-xl">
            <h1 className="font-display text-step-4 leading-[1.02] font-normal tracking-tight text-ink">
              Lihat look pengantinmu sebelum bayar trial.
            </h1>

            <p className="mt-6 max-w-prose text-step-1 leading-relaxed text-ink-soft">
              Trial rias pengantin menghabiskan {site.trialCost} dan setengah hari,
              dan sering berakhir dengan look yang dia tidak mau. Susun dulu di
              sini: makeup, sanggul, kebaya, kalung dan anting, semuanya bertumpuk
              di satu foto wajahnya sendiri.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/look"
                className="inline-flex min-h-12 items-center rounded-control bg-ink px-6 text-step-0 font-medium text-paper no-underline transition-colors hover:bg-accent"
              >
                Mulai susun look
              </Link>
              <Link
                href="/readiness"
                className="inline-flex min-h-12 items-center rounded-control border border-line-strong px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-surface"
              >
                Cek kesiapan rambut
              </Link>
            </div>

            <p className="mt-5 text-step--1 text-ink-faint">
              Gratis dicoba dengan foto contoh. Tidak perlu akun.
            </p>
          </div>

          <figure className="m-0">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface">
                <Image
                  src="/demo/half-body.jpg"
                  alt="Foto calon pengantin sebelum apa pun dipasang: kaus polos, rambut disisir ke belakang, latar abu-abu."
                  fill
                  sizes="(min-width: 1024px) 22rem, 45vw"
                  className="object-cover"
                  priority
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-step--2 font-medium text-ink">
                  Fotonya
                </span>
              </div>

              <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface shadow-frame">
                <Image
                  src="/fixtures/c12e0cb5a8dd4861554ab98e28375c25.jpg"
                  alt="Foto yang sama setelah lima try-on ditumpuk: kebaya renda gading, sanggul, makeup pengantin, kalung emas dan anting menjuntai."
                  fill
                  sizes="(min-width: 1024px) 22rem, 45vw"
                  className="object-cover"
                  priority
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-step--2 font-medium text-paper">
                  Lima lapis kemudian
                </span>
              </div>
            </div>

            <figcaption className="mt-4 flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-px w-8 shrink-0 rule-gold" />
              <span className="text-step--1 leading-6 text-ink-faint">
                Kebaya, sanggul, makeup, kalung dan anting dipasang berurutan ke
                frame yang sama. Hasilnya satu foto, bukan kolase — latar dan
                potongannya tetap miliknya.
              </span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
