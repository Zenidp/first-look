import Container from "@/components/shared/container";

/**
 * Three steps.
 *
 * The only place on this page where numbering carries meaning, because the
 * order is genuinely load-bearing: the photograph has to exist before anything
 * can be stacked on it, and the stack has to exist before there is anything to
 * send. Numbering anything else here would be decoration.
 */
const STEPS = [
  {
    title: "Satu foto, dipandu",
    body:
      "Setengah badan, menghadap kamera. Pemandu crop menentukan ukuran wajahnya di " +
      "frame, jadi fotonya lolos syarat mesin sebelum apa pun diunggah — dan tidak ada " +
      "unit terbuang untuk foto yang akan ditolak.",
  },
  {
    title: "Tumpuk look-nya",
    body:
      "Busana, rambut, makeup, kalung, anting. Tiap pilihan dijalankan ke hasil " +
      "sebelumnya, bukan ke foto aslinya, jadi yang keluar adalah satu foto utuh. " +
      "Kombinasi yang pasti gagal ditolak di layar, bukan setelah dibayar.",
  },
  {
    title: "Periksa, lalu kirim",
    body:
      "Jadikan video lima detik supaya kainnya terlihat jatuh, cek kesiapan rambutnya " +
      "terhadap tanggal pernikahan, lalu kirim satu look board ke periasnya.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 border-b border-line bg-surface">
      <Container width="wide" className="py-16 sm:py-24">
        <h2 className="max-w-2xl font-display text-step-3 leading-tight font-normal text-ink">
          Tiga langkah, sebelum uang pertama keluar.
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-line-strong text-step--1 font-medium text-ink tabular-nums">
                  {index + 1}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </div>
              <h3 className="mt-4 font-display text-step-1 leading-snug text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-step--1 leading-6 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
