import Link from "next/link";

import Container from "@/components/shared/container";

/**
 * Deep feature, block two — and the reason this project exists.
 *
 * Everyone points try-on at "what would this look like?". This points hair
 * diagnostics at "can her hair actually get there by the wedding?", which is a
 * planning question, not a retail one.
 *
 * This is the page's dark section. One per page, placed here on purpose: it is
 * the beat the reader is supposed to slow down for, and nine identical light
 * sections in a row is what makes a long page feel endless.
 *
 * The three verdicts below are the real outputs of src/lib/readiness.ts, and
 * the same measured bride produces all three depending on her date and her
 * target. Nothing here is a mock-up of a feature that does not run.
 */
const VERDICTS = [
  {
    label: "Siap",
    tone: "ready",
    example: "Sanggul, 12 bulan lagi",
    body: "Panjang dan teksturnya sudah memenuhi syarat gaya itu hari ini.",
  },
  {
    label: "Bisa dengan persiapan",
    tone: "prep",
    example: "Gerai panjang, 12 bulan lagi",
    body: "Kurang panjang, tapi waktunya cukup — dengan rencana bulan per bulan.",
  },
  {
    label: "Belum sampai",
    tone: "late",
    example: "Gerai panjang, 6 bulan lagi",
    body: "Selisihnya tidak tertutup pada tanggal itu. Ada alternatif, dan ada angkanya.",
  },
] as const;

const TONE_CLASS = {
  ready: "border-l-4 border-l-ready",
  prep: "border-l-4 border-l-prep",
  late: "border-l-4 border-l-late",
} as const;

export default function ReadinessFeature() {
  return (
    <section id="kesiapan" className="scroll-mt-24 bg-night text-night-soft">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-step--2 font-medium tracking-[0.18em] text-gold uppercase">
              Yang tidak ditanyakan siapa pun
            </p>
            <h2 className="mt-4 font-display text-step-3 leading-tight font-normal text-paper">
              Bukan cuma &ldquo;bagus atau tidak&rdquo;. Juga: rambutnya keburu atau
              tidak.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed">
              Tiga diagnosa membaca panjang, tipe dan kondisi rambutnya dari foto.
              Lapisan aturan kami membandingkannya dengan gaya yang dia incar dan
              sisa waktu sampai hari H, lalu menjawab dengan satu dari tiga vonis.
            </p>
            <p className="mt-4 max-w-prose text-step-0 leading-relaxed">
              Kalau jawabannya belum sampai, dia mendapat alternatif yang panjang
              rambutnya sudah cukup, dan rencana bulan per bulan. Setiap ambang yang
              memicu vonis itu bisa dibuka dan dibaca — sebuah &ldquo;kenapa&rdquo;
              yang terlihat, bukan kotak hitam.
            </p>

            <Link
              href="/readiness"
              className="mt-8 inline-flex min-h-12 items-center rounded-control bg-paper px-6 text-step-0 font-medium text-ink no-underline transition-colors hover:bg-gold-tint"
            >
              Coba dengan foto contoh
            </Link>
          </div>

          <ul className="space-y-4 self-center">
            {VERDICTS.map((verdict) => (
              <li
                key={verdict.label}
                className={`rounded-card border border-night-line bg-white/4 p-5 ${TONE_CLASS[verdict.tone]}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-display text-step-1 text-paper">
                    {verdict.label}
                  </span>
                  <span className="text-step--2 tabular-nums">{verdict.example}</span>
                </div>
                <p className="mt-2 text-step--1 leading-6">{verdict.body}</p>
              </li>
            ))}
            <li className="pt-2 text-step--2 leading-5">
              Pertumbuhan dihitung dengan rata-rata 1,25 cm per bulan. API
              mengembalikan kata, bukan ukuran, jadi hasilnya kisaran — dan halaman
              itu mengatakannya sendiri.
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
