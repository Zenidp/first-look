/**
 * Photo intake: read it correctly, let her frame it, refuse it honestly.
 *
 * The API rejects on the *subject*, not the format (FINDINGS §2c), and a
 * rejection after task creation is still billed (FINDINGS §3). So everything
 * here runs in the browser for zero units, before a single byte is uploaded.
 *
 * Two framings are needed and neither can be guessed from a file:
 *
 *   beauty  waist-up. Face must clear the API's 128px minimum AND the torso
 *           must be present for cloth-v4. Only this framing carries a whole
 *           look chain (FINDINGS §8a).
 *   outfit  full-body. The face is far too small for makeup, hair or jewellery
 *           here, so the garment is the only thing that can be composited.
 *
 * Rather than detect a face — no dependency in this project does that, and a
 * wrong guess is a billed failure — the guide *defines* the face size. Align
 * to the oval and the face is 180px by construction.
 */

/** Everything downstream is 3:4, which is also well inside the video API's 1:2.5–2.5:1 window. */
export const OUT_WIDTH = 768;
export const OUT_HEIGHT = 1024;
export const ASPECT = OUT_WIDTH / OUT_HEIGHT;

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Upscaling invents no detail. Past this factor the composite is visibly soft,
 * so it is kinder — and cheaper — to ask for a closer photo than to spend units
 * producing something she will reject.
 */
const MAX_UPSCALE = 1.3;

export type Framing = "beauty" | "outfit";

/**
 * Guide geometry, as fractions of the crop frame. Measured off
 * input/half-body.jpg and input/full-body.jpg, the two frames whose chains are
 * known to work end to end.
 */
export const GUIDES: Record<
  Framing,
  {
    label: string;
    hint: string;
    /** beauty only: the oval her face should fill. */
    face?: { cx: number; cy: number; rx: number; ry: number };
    /** outfit only: where the crown and the feet belong. */
    lines?: { y: number; label: string }[];
  }
> = {
  beauty: {
    label: "Setengah badan",
    hint: "Pas-kan wajah ke oval, dan pastikan kedua bahu masuk frame.",
    // rx 0.12 of 768 => ~184px face width, comfortably over the 128px minimum.
    face: { cx: 0.5, cy: 0.2, rx: 0.12, ry: 0.155 },
  },
  outfit: {
    label: "Seluruh badan",
    hint: "Ujung kepala di garis atas, ujung kaki di garis bawah.",
    lines: [
      { y: 0.04, label: "ujung kepala" },
      { y: 0.96, label: "ujung kaki" },
    ],
  },
};

// --- EXIF -------------------------------------------------------------------

/**
 * Reads the EXIF orientation tag out of a JPEG. Returns 1 when absent or
 * unreadable, which is the "already upright" case.
 *
 * This matters more than it looks. A phone portrait frequently carries
 * orientation 6 (rotate 90° CW) while its pixels are landscape. Uploaded
 * as-is, the API sees a sideways face and rejects it for face angle — after
 * charging. But re-encoding *every* photo to normalise it would be worse: the
 * fixture cache is keyed on a hash of the bytes, so a gratuitous re-encode
 * turns every cache hit into a billable call (FINDINGS §2e). Hence: detect,
 * and only rewrite when there is something to fix.
 */
export async function readOrientation(file: File): Promise<number> {
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") return 1;

  // The EXIF block lives near the front; 128KB is far more than enough.
  const head = new DataView(await file.slice(0, 131072).arrayBuffer());
  if (head.byteLength < 4 || head.getUint16(0) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 <= head.byteLength) {
    const marker = head.getUint16(offset);
    // Standalone markers carry no length; anything not 0xFFxx means we have
    // walked off the segment structure.
    if ((marker & 0xff00) !== 0xff00) return 1;
    const size = head.getUint16(offset + 2);
    if (size < 2) return 1;

    if (marker === 0xffe1) {
      const start = offset + 4;
      // "Exif\0\0"
      if (start + 6 > head.byteLength || head.getUint32(start) !== 0x45786966) return 1;
      return orientationFromTiff(head, start + 6);
    }
    // 0xFFDA is start-of-scan: image data follows, no more metadata.
    if (marker === 0xffda) return 1;
    offset += 2 + size;
  }
  return 1;
}

function orientationFromTiff(view: DataView, tiff: number): number {
  if (tiff + 8 > view.byteLength) return 1;

  const endian = view.getUint16(tiff);
  if (endian !== 0x4949 && endian !== 0x4d4d) return 1;
  const little = endian === 0x4949;

  const ifd = tiff + view.getUint32(tiff + 4, little);
  if (ifd + 2 > view.byteLength) return 1;

  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** Orientations 5–8 exchange width and height. */
export const swapsAxes = (orientation: number) => orientation >= 5 && orientation <= 8;

// --- loading ----------------------------------------------------------------

export type LoadedPhoto = {
  /** Upright, whatever the file claimed. Draw from this, never from the raw file. */
  bitmap: ImageBitmap;
  width: number;
  height: number;
  orientation: number;
  file: File;
  /**
   * True when the original bytes are already exactly what the API wants, so
   * they can be forwarded untouched and keep their fixture identity.
   */
  conforms: boolean;
};

/**
 * Decodes a file into an upright bitmap.
 *
 * `imageOrientation: "from-image"` is the modern default but is not universally
 * honoured, so the result is checked against what the EXIF tag implies and
 * rotated by hand if the browser did nothing. Silently trusting the option is
 * how a sideways photo reaches the API and bills for the privilege.
 */
export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  const orientation = await readOrientation(file);

  let bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  // If the tag says the axes swap but the decoded bitmap kept the raw aspect,
  // the browser ignored the option. Do it ourselves.
  if (swapsAxes(orientation)) {
    const raw = await createImageBitmap(file, { imageOrientation: "none" });
    const browserRotated = bitmap.width === raw.height && bitmap.height === raw.width;
    raw.close();
    if (!browserRotated) {
      const fixed = await rotate(bitmap, orientation);
      bitmap.close();
      bitmap = fixed;
    }
  }

  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
  const conforms =
    isJpeg &&
    orientation === 1 &&
    file.size <= MAX_BYTES &&
    Math.max(bitmap.width, bitmap.height) <= Math.max(OUT_WIDTH, OUT_HEIGHT);

  return { bitmap, width: bitmap.width, height: bitmap.height, orientation, file, conforms };
}

async function rotate(bitmap: ImageBitmap, orientation: number): Promise<ImageBitmap> {
  const swap = swapsAxes(orientation);
  const w = swap ? bitmap.height : bitmap.width;
  const h = swap ? bitmap.width : bitmap.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Browser tidak bisa memproses gambar ini.");

  // Standard EXIF orientation transforms.
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, w, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, w, h); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, h); break;
    default: break;
  }
  ctx.drawImage(bitmap, 0, 0);
  return createImageBitmap(canvas);
}

// --- validation -------------------------------------------------------------

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

export type CropRect = { x: number; y: number; width: number; height: number };

/**
 * Everything that can be known without spending a unit.
 *
 * Returns a list rather than throwing on the first problem: a bride who sends a
 * 12 MB sideways screenshot should be told everything at once, not made to
 * discover the faults one upload at a time.
 */
export function validateCrop(
  photo: LoadedPhoto,
  crop: CropRect,
): { ok: boolean; problems: string[]; upscale: number } {
  const problems: string[] = [];

  if (photo.file.size > MAX_BYTES) {
    problems.push("Ukuran filenya lebih dari 10 MB. Kecilkan dulu, atau foto ulang.");
  }
  if (crop.width < 1 || crop.height < 1) {
    problems.push("Area yang dipilih kosong.");
  }

  // How much the chosen region has to be blown up to fill 768x1024.
  const upscale = OUT_WIDTH / Math.max(crop.width, 1);
  if (upscale > MAX_UPSCALE) {
    problems.push(
      "Fotonya kurang tajam untuk area sepotong ini. Ambil foto dari lebih dekat, " +
        "atau pilih area yang lebih lebar.",
    );
  }

  return { ok: problems.length === 0, problems, upscale };
}

// --- export -----------------------------------------------------------------

/**
 * Renders the chosen region to the 768x1024 jpg the rest of the app expects.
 *
 * `untouched` short-circuits the whole thing: when the original file already
 * conforms and she did not move the frame, the original bytes go through as
 * they are, which is what keeps a cached look replaying for zero units.
 */
export async function exportCrop(
  photo: LoadedPhoto,
  crop: CropRect,
  opts: { untouched?: boolean; name?: string } = {},
): Promise<File> {
  if (opts.untouched && photo.conforms) return photo.file;

  const canvas = document.createElement("canvas");
  canvas.width = OUT_WIDTH;
  canvas.height = OUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Browser tidak bisa memproses gambar ini.");

  ctx.imageSmoothingQuality = "high";
  // A photo cropped right to the edge would otherwise leave transparent
  // margins, which become black in a jpg.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUT_WIDTH, OUT_HEIGHT);
  ctx.drawImage(
    photo.bitmap,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, OUT_WIDTH, OUT_HEIGHT,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new PhotoError("Gagal menyimpan hasil crop.");

  const name = (opts.name ?? photo.file.name).replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/** The largest 3:4 region that fits, centred — the starting frame in the cropper. */
export function defaultCrop(width: number, height: number): CropRect {
  let w = width;
  let h = w / ASPECT;
  if (h > height) {
    h = height;
    w = h * ASPECT;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
