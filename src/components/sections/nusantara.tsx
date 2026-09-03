import Image from "next/image";

import Container from "@/components/shared/container";
import { REFERENCE_LIBRARY, referencePath } from "@/lib/references";

/**
 * Deep feature, block one: the localisation.
 *
 * Not a marketing claim — a constraint that was measured. Perfect Corp's own
 * bridal catalogue is three wedding looks and four gowns, all Western, with no
 * kebaya anywhere in it. Everything Indonesian in this product goes through the
 * custom-reference path instead, and the garment strip below is that library,
 * read from the same file the look builder reads.
 */
const GARMENTS = REFERENCE_LIBRARY.filter((item) => item.use === "clothes");

export default function Nusantara() {
  return (
    <section id="nusantara" className="scroll-mt-24 border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
              Katalog bawaannya tidak punya satu pun kebaya.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              Itu bukan tebakan, itu hasil audit: tiga look pengantin dan empat gaun,
              semuanya Barat. Untuk pasar yang menikah dengan kebaya, songket dan
              ulos, katalog itu kosong.
            </p>
            <p className="mt-4 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              Jadi busana dan makeup daerah tidak diambil dari katalog. Keduanya
              masuk lewat gambar referensi sendiri — dan Indonesia dibaca sebagai
              beberapa estetika, bukan satu. Paes ageng Yogyakarta, siger Sunda dan
              suntiang Minang adalah siluet, hiasan kepala dan riasan yang berbeda.
            </p>

            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {GARMENTS.map((garment) => (
                <li key={garment.id} className="flex items-baseline gap-2">
                  <span aria-hidden="true" className="size-1 rounded-full bg-gold" />
                  <span className="text-step--1 text-ink-soft">{garment.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure className="m-0">
            <div className="relative aspect-3/4 overflow-hidden rounded-frame border border-line bg-surface shadow-frame">
              <Image
                src="/fixtures/8ff00575b06c290b8e205605f22c4d41.jpg"
                alt="Hasil try-on seluruh badan: kebaya renda gading berlengan panjang di atas kain batik parang cokelat."
                fill
                sizes="(min-width: 1024px) 30rem, 90vw"
                className="object-cover"
              />
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
              {GARMENTS.slice(0, 4).map((garment) => (
                <div key={garment.id}>
                  <div className="relative aspect-3/4 overflow-hidden rounded-card border border-line bg-surface">
                    <Image
                      src={referencePath(garment.id)}
                      alt=""
                      fill
                      sizes="8rem"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-1.5 text-step--2 leading-4 text-ink-faint">
                    {garment.region}
                  </p>
                </div>
              ))}
            </div>

            <figcaption className="mt-4 text-step--2 leading-5 text-ink-faint">
              Referensi busana di atas adalah gambar sintetis yang dibuat untuk
              proyek ini, bukan karya perancang sungguhan. Hasil try-on di
              sebelahnya adalah keluaran API yang sebenarnya.
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
