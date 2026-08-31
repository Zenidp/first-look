/**
 * Prepare a photo for upload, in the browser, without adding `sharp`.
 *
 * The API takes jpg only, at most 10 MB, long side at most 1024px. A raw phone
 * photo is ~3000px and would be rejected *after* the units are charged, so this
 * is a credit-saving step rather than a cosmetic one.
 *
 * Critically, a file that already meets the spec is returned **untouched**.
 * Re-encoding it through a canvas would produce different bytes for the same
 * visible image, and the fixture cache is keyed on a hash of those bytes — so a
 * gratuitous re-encode turns every cache hit into a billable live call. That
 * matters most on demo day, when the whole point is to replay fixtures for free.
 */

const MAX_SIDE = 1024;
const MAX_BYTES = 10 * 1024 * 1024;

function isJpeg(file: File): boolean {
  return file.type === "image/jpeg" || file.type === "image/jpg";
}

async function dimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

export async function prepareImage(file: File): Promise<File> {
  if (isJpeg(file) && file.size <= MAX_BYTES) {
    const { width, height } = await dimensions(file);
    if (Math.max(width, height) <= MAX_SIDE) {
      // Already within spec. Passing the original bytes through is what keeps
      // the fixture cache usable from the UI.
      return file;
    }
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("jpeg encode failed");

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
