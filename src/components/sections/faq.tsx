import Container from "@/components/shared/container";

/**
 * The last objections, answered.
 *
 * Exported as data so app/(marketing)/page.tsx can pass the identical strings
 * to the FAQPage JSON-LD. Structured data that disagrees with the visible text
 * is a manual-action risk, and the only reliable way to keep them in step is
 * for there to be one copy.
 *
 * Built on <details>/<summary>: keyboard operable, screen-reader announced and
 * expandable before hydration, with no accordion library and no client
 * component behind it.
 */
export const FAQ_ITEMS = [
  {
    q: "Hasilnya benar-benar wajah saya, atau wajah model?",
    a:
      "Wajahmu. Tiap pilihan dijalankan ke fotomu sendiri, dan hasil satu langkah menjadi " +
      "masukan langkah berikutnya, jadi yang keluar tetap satu foto dengan wajah, latar dan " +
      "potongan yang sama. Pengecualiannya adalah halaman konsep prewedding, yang memang " +
      "mengarang adegan baru dan diberi label AI di setiap gambarnya.",
  },
  {
    q: "Apakah ini menggantikan trial rias?",
    a:
      "Tidak. Ini memindahkan kesepakatan soal look ke sebelum trial. Tekstur kulit, daya " +
      "tahan riasan seharian dan cara kain jatuh saat dipakai bergerak tetap hanya bisa " +
      "diuji langsung. Yang hilang adalah trial yang dimulai tanpa arah yang disepakati.",
  },
  {
    q: "Fotonya harus seperti apa?",
    a:
      "Setengah badan, menghadap kamera, bahu terlihat, satu wajah saja, dan cahaya rata. " +
      "Aplikasinya memandu pemotongan foto sebelum apa pun diunggah, jadi foto yang akan " +
      "ditolak mesin ketahuan lebih dulu tanpa biaya.",
  },
  {
    q: "Kenapa rambut harus tergerai untuk cek kesiapan?",
    a:
      "Karena diagnosanya menjawab tentang fotonya, bukan tentang orangnya. Terukur pada " +
      "model yang sama: rambut yang disanggul terbaca satu tingkat lebih lurus daripada " +
      "rambut yang sama saat tergerai. Vonis yang berubah karena cara dia menata rambut " +
      "pagi itu bukan vonis.",
  },
  {
    q: "Apakah bisa untuk pengantin berhijab?",
    a:
      "Bisa. Pustaka busananya memuat dua look hijab — kebaya hijab modern dan gaun syar'i " +
      "Aceh — dan keduanya lewat jalur try-on busana yang sama seperti kebaya lainnya.",
  },
  {
    q: "Foto saya disimpan?",
    a:
      "Tidak ada akun dan tidak ada galeri. Foto diunggah untuk diproses, dan hasil " +
      "pemrosesan disimpan sebagai cache supaya look yang sama tidak ditagih dua kali. " +
      "Berkas di sisi penyedia API kedaluwarsa sendiri sesuai ketentuan mereka.",
  },
  {
    q: "Kenapa ada yang butuh beberapa detik?",
    a:
      "Karena panggilannya nyata. Satu lapisan try-on rata-rata 7,4 detik dan klip video " +
      "lima detik butuh sekitar satu menit. Look yang sudah pernah dibuat tampil " +
      "seketika dari cache.",
  },
];

export default function Faq() {
  return (
    <section id="tanya" className="scroll-mt-24 border-b border-line bg-surface">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
            Pertanyaan yang biasanya muncul.
          </h2>

          <div className="border-t border-line">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group border-b border-line [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-step-0 font-medium text-ink">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="mt-1.5 flex size-5 shrink-0 items-center justify-center"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="size-4 text-ink-faint transition-transform group-open:rotate-45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-prose pb-6 text-step--1 leading-6 text-ink-soft">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
