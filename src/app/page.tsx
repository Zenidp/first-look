import Link from "next/link";

/**
 * Landing.
 *
 * CONTEXT §8 asks for one sentence, one upload, nothing else. The wedding-date
 * field named there belongs to Hair Readiness, which is deferred — so it is not
 * here. An input that collects something nothing uses is worse than a missing
 * one: it promises a feature that will not answer.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-rose-700">First Look</p>

      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
        Lihat look pengantinmu
        <br />
        sebelum bayar trial.
      </h1>

      <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600">
        Trial makeup pengantin di Jakarta menghabiskan uang dan setengah hari, dan
        sering berakhir dengan look yang tidak dia mau. Susun dulu di sini — makeup,
        sanggul, kebaya, kalung dan anting, semuanya di{" "}
        <strong className="font-semibold text-zinc-900">satu foto wajahnya sendiri</strong>,
        bukan screenshot wajah orang lain.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/look"
          className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Mulai susun look
        </Link>
        <Link
          href="/readiness"
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cek kesiapan rambut
        </Link>
        <Link
          href="/prewedding"
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Konsep prewedding
        </Link>
      </div>

      <dl className="mt-14 grid gap-6 border-t border-zinc-200 pt-8 sm:grid-cols-3">
        <div>
          <dt className="text-sm font-medium text-zinc-900">Satu foto, bukan kolase</dt>
          <dd className="mt-1 text-xs leading-5 text-zinc-500">
            Tiap pilihan ditumpuk ke foto yang sama, jadi hasilnya satu foto asli —
            wajah, latar dan potongannya tetap miliknya.
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-900">Nusantara, bukan katalog Barat</dt>
          <dd className="mt-1 text-xs leading-5 text-zinc-500">
            Kebaya Jawa, Sunda, Minang, Bali, Bugis, Batak dan dua look hijab — tidak
            ada satu pun di katalog bawaan.
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-900">Bukan cuma &ldquo;kelihatannya&rdquo;</dt>
          <dd className="mt-1 text-xs leading-5 text-zinc-500">
            Juga menjawab apakah rambutnya bisa sampai ke gaya itu pada tanggal
            pernikahannya — selagi masih ada waktu memperbaiki.
          </dd>
        </div>
      </dl>
    </main>
  );
}
