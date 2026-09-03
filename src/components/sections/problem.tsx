import Container from "@/components/shared/container";

/**
 * The problem, in the reader's language.
 *
 * Written from the bride's and the rias' side of the table — "screenshot wajah
 * orang lain", not "reference mismatch". This is the section that earns the
 * right to describe a solution, so it names three specific failures rather
 * than gesturing at a category.
 */
const FAILURES = [
  {
    title: "Patokannya wajah orang lain",
    body:
      "Calon pengantin datang membawa screenshot Pinterest. Perias melihat wajah yang " +
      "berbeda, bentuk mata yang berbeda dan warna kulit yang berbeda dari kliennya, " +
      "lalu keduanya berharap hasilnya mirip.",
  },
  {
    title: "Kesepakatan baru terjadi di kursi rias",
    body:
      "Titik pertama keduanya melihat hal yang sama adalah saat trial — setelah uangnya " +
      "keluar, setelah setengah hari terpakai, dan saat mengubah arah berarti mengulang " +
      "dari awal.",
  },
  {
    title: "Rambut tidak pernah diperiksa lebih dulu",
    body:
      "Sanggul yang gagal biasanya bukan soal keahlian perias, tapi soal panjang, " +
      "tekstur dan kondisi rambut. Itu ketahuan di trial, saat hanya tersisa beberapa " +
      "minggu — padahal rambut tumbuh sekitar 1,25 cm sebulan.",
  },
];

export default function Problem() {
  return (
    <section className="border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
              Trialnya bukan tempat menemukan bahwa look-nya salah.
            </h2>
            <p className="mt-5 max-w-prose text-step-0 leading-relaxed text-ink-soft">
              Ini bukan masalah selera. Ini masalah urutan: keputusan yang paling
              mahal diambil paling akhir, dengan informasi paling sedikit.
            </p>
          </div>

          <ol className="space-y-8">
            {FAILURES.map((failure, index) => (
              <li key={failure.title} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="mt-1 shrink-0 font-display text-step-1 text-ink-faint tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-step-0 font-semibold text-ink">
                    {failure.title}
                  </h3>
                  <p className="mt-1.5 max-w-prose text-step--1 leading-6 text-ink-soft">
                    {failure.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
