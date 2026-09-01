/**
 * Turns engine errors into something a bride can act on.
 *
 * The platform's failure messages are written for the integrator, not the user:
 * "error_src_face_too_small", "Wrist size should fit in range", "earlobe
 * alignment not confident". Shown raw they read as a broken app rather than a
 * photo that needs retaking — and since most of these are billed (FINDINGS §3),
 * a user who does not understand what went wrong will simply pay to fail again.
 *
 * The vocabulary here was collected by hitting the failures, not by reading the
 * docs: FINDINGS §2, §2c and §8b.
 */

type Rule = { match: RegExp; message: string };

/** `src` faults are her photo; `ref` faults are the product or style image. */
const RULES: Rule[] = [
  // --- the source photo ------------------------------------------------------
  {
    match: /error_src_face_too_small|face.*too small/i,
    message:
      "Wajahnya terlalu kecil di foto ini. Pakai crop terpandu dan pas-kan wajah ke oval, " +
      "atau ambil foto dari lebih dekat.",
  },
  {
    match: /error_src_no_face|no.*face.*detect/i,
    message: "Tidak ada wajah yang terdeteksi. Pastikan wajahnya menghadap kamera dan tidak terhalang.",
  },
  {
    match: /error_src_large_face_angle|error_face_angle_invalid|face.*angle/i,
    message:
      "Wajahnya terlalu menyerong. Butuh foto menghadap lurus ke kamera, kepala tegak tanpa miring.",
  },
  {
    match: /error_src_eye_closed/i,
    message: "Matanya terpejam di foto ini. Pilih foto dengan kedua mata terbuka jelas.",
  },
  {
    match: /error_src_eye_occluded|error_src_lip_occluded/i,
    message:
      "Ada yang menutupi mata atau bibirnya — rambut, tangan, atau kacamata. " +
      "Pakai foto dengan wajah bersih.",
  },

  // --- specific features -----------------------------------------------------
  {
    match: /earlobe alignment/i,
    message:
      "Telinganya tertutup rambut, jadi antingnya tidak bisa dipasang. " +
      "Pilih model rambut sanggul, atau lewati antingnya.",
  },
  {
    match: /error_no_teeth/i,
    message: "Giginya tidak terlihat. Pemutihan gigi butuh foto dengan senyum terbuka.",
  },
  {
    match: /error_nail_too_small/i,
    message: "Kukunya terlalu kecil di frame. Butuh foto makro yang didominasi tangan.",
  },
  {
    match: /hand pose/i,
    message:
      "Posisi tangannya belum pas. Satu tangan saja, tegak, punggung tangan menghadap kamera, " +
      "pergelangan ikut masuk frame.",
  },
  {
    match: /wrist/i,
    message:
      "Posisi pergelangannya belum pas. Lengan tegak lurus dengan pergelangan menghadap kamera, " +
      "bukan menyamping.",
  },

  // --- the reference image ---------------------------------------------------
  {
    match: /error_ref_face_too_small|error_inappropriate_ref/i,
    message:
      "Foto referensinya tidak memenuhi syarat — biasanya terlalu kecil, menyerong, " +
      "atau wajahnya tertutup rambut. Pakai foto referensi yang besar dan menghadap depan.",
  },
  { match: /error_ref_no_face/i, message: "Tidak ada wajah di foto referensinya." },

  // --- request-level, and free -----------------------------------------------
  {
    match: /InvalidTemplate/i,
    message: "Pilihan itu sudah tidak ada di katalog. Pilih yang lain.",
  },
  {
    match: /OfflineCacheMiss/i,
    message:
      "Mode hemat aktif: kombinasi ini belum tersimpan, jadi tidak dijalankan. " +
      "Tidak ada unit yang terpakai.",
  },
  {
    match: /PollTimeout/i,
    message: "Prosesnya terlalu lama dan dihentikan. Coba lagi sebentar lagi.",
  },
  {
    match: /MissingApiKey/i,
    message: "Konfigurasi server belum lengkap. Hubungi pengelola aplikasi.",
  },
  {
    match: /rate limit|429/i,
    message: "Terlalu banyak permintaan sekaligus. Tunggu sebentar lalu coba lagi.",
  },
];

/**
 * `code` and `message` both come from the API response. Either can carry the
 * useful part — engine errors put it in `error_message` while validation
 * failures put it in `error_code` — so both are searched.
 */
export function explain(code?: string, message?: string): string {
  const haystack = `${code ?? ""} ${message ?? ""}`;
  const hit = RULES.find((r) => r.match.test(haystack));
  if (hit) return hit.message;

  // Nothing matched. Say so plainly and keep the original, rather than invent a
  // reason — an unrecognised failure is exactly when the raw text is worth most.
  return message?.trim()
    ? `Langkah ini gagal: ${message.trim()}`
    : "Langkah ini gagal karena sebab yang tidak dikenali.";
}

/**
 * Whether the failure happened before the task was created — the only case that
 * is certainly free. Everything else must be assumed billed (FINDINGS §3).
 */
export function wasFree(code?: string): boolean {
  return /OfflineCacheMiss|InvalidPayload|Missing|Bad|Unknown|Wrong|InvalidTemplate|InvalidParameters/i.test(
    code ?? "",
  );
}
