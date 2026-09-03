import Container from "@/components/shared/container";
import { site } from "@/config/site";

/**
 * The pricing slot, answered honestly.
 *
 * There is no price list yet, and printing one would be fiction. What this
 * section owes the reader — and the judge who asks whether this could be a
 * company — is the shape of the business: who pays, why they would, and where
 * the second line of revenue is. That is a more useful answer than three
 * invented tiers.
 */
const MODEL = [
  {
    heading: "Yang membayar adalah periasnya",
    body:
      "Bukan pengantinnya. Ini alat kerja untuk profesional jasa: juru rias dan sanggar " +
      "sudah membayar untuk perkakas, dan pendapatan per klien mereka jelas. Satu trial " +
      "yang tidak terbuang sudah menutup biaya langganan berbulan-bulan.",
  },
  {
    heading: "Look board-nya yang menyebar",
    body:
      "Artefak yang dikirim pengantin ke periasnya, ke ibunya, ke grup keluarganya. " +
      "Setiap kiriman memperkenalkan periasnya ke calon klien berikutnya — distribusinya " +
      "menempel pada barang yang sudah pasti diteruskan.",
  },
  {
    heading: "Baris kedua ada di rambut",
    body:
      "Vonis “bisa dengan persiapan” adalah rujukan perawatan yang terjadi secara alami: " +
      "salon, treatment, hair extension. Diagnosanya menghasilkan kebutuhan yang " +
      "spesifik, bertanggal, dan sudah diterima calon pengantin sebelum ada yang menjual " +
      "apa pun kepadanya.",
  },
];

export default function WhoPays() {
  return (
    <section id="untuk-mua" className="scroll-mt-24 border-b border-line">
      <Container width="wide" className="py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-step-3 leading-tight font-normal text-ink">
            Dibangun untuk juru rias, bukan untuk mengganti mereka.
          </h2>
          <p className="mt-5 text-step-0 leading-relaxed text-ink-soft">
            Alat ini tidak merias siapa pun. Ia memindahkan kesepakatan soal look ke
            sebelum trial, supaya waktu perias di hari trial dipakai untuk
            menyempurnakan, bukan untuk menemukan bahwa arahnya salah.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {MODEL.map((item) => (
            <div key={item.heading} className="border-t border-line pt-5">
              <h3 className="font-display text-step-1 leading-snug text-ink">
                {item.heading}
              </h3>
              <p className="mt-2 text-step--1 leading-6 text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-prose text-step--1 leading-6 text-ink-faint">
          Angka pembanding yang dipakai di halaman ini: satu sesi trial rias
          pengantin di {site.city} berkisar {site.trialCost} dan memakan setengah
          hari kerja bagi kedua pihak.
        </p>
      </Container>
    </section>
  );
}
