#!/usr/bin/env python3
"""
Generate the image assets described in docs/IMAGE-PROMPTS.md.

Uses Gemini 2.5 Flash Image through Vertex AI with your gcloud Application
Default Credentials. Billed to the active gcloud project, roughly $0.04 an
image.

    gcloud auth application-default login      # once
    python3 scripts/generate-assets.py --list
    python3 scripts/generate-assets.py face-front
    python3 scripts/generate-assets.py --group bride
    python3 scripts/generate-assets.py --all

Images are saved straight to where the app expects them, downscaled to the
API's 1024px limit and written as jpg. Existing files are skipped unless you
pass --force, so a rerun costs nothing.

The bride's side angles and full-body shot are conditioned on face-front.jpg so
the same person carries across all four; generate face-front first.
"""

import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MODEL = "gemini-2.5-flash-image"
LOCATION = "us-central1"
MAX_SIDE = 1024

BASE = (
    "Photorealistic professional photograph, shot on a full-frame camera with an "
    "85mm lens, natural soft studio lighting from the front, no harsh shadows on "
    "the face, sharp focus, high resolution, true-to-life skin texture, neutral "
    "colour grading. No text, no watermark, no logo, no border, no collage."
)

NEGATIVE = (
    " Avoid: multiple people, cropped head, tilted head, closed or squinting eyes, "
    "sunglasses, hand or hair covering the face, heavy shadow across the face, "
    "motion blur, fisheye distortion, busy or cluttered background, text overlays, "
    "watermarks, split or collage layouts."
)

FRONT_FACE = (
    "Photorealistic head-and-shoulders portrait of a beautiful 27-year-old European "
    "woman looking straight into the camera. Fair skin with a light natural flush, "
    "blue-grey eyes, light brown hair, forehead and temples fully exposed, both ears "
    "visible, no strands falling near the eyes. Symmetrical features, high cheekbones, "
    "clear complexion. Bare face, no makeup. Calm closed-mouth expression, lips relaxed "
    "and fully visible. Both eyes wide open and clearly visible. "
    "Framing: head, shoulders and upper chest visible. Her face fills roughly half the "
    "height of the frame. Shoulders clearly in frame and not cropped. Head perfectly "
    "upright and square to the camera, no tilt, no turn. "
    "She wears a plain black fitted sleeveless top. "
    "Plain seamless light grey background. "
)

GARMENT_BASE = (
    "Photorealistic e-commerce product photograph of a traditional Indonesian garment, "
    "presented flat and centred on a plain seamless white background, shot from directly "
    "above, the entire garment inside the frame with nothing cropped, even diffuse "
    "lighting with no harsh shadows, fabric texture and embroidery clearly visible, "
    "sharp focus, high resolution. No person, no mannequin, no text, no watermark, no props. "
)

MAKEUP_BASE = (
    "Photorealistic beauty close-up portrait of an Indonesian woman looking straight into "
    "the camera, head upright and perfectly square to the camera, no tilt, no turn. Both "
    "eyes wide open and fully visible. Lips closed, relaxed and fully visible. Her face "
    "fills most of the frame. "
    "The skin at her temples and beside the outer corners of both eyes is completely clear "
    "and visible - no hair, no ornament, no jewellery and no fabric touching or overlapping "
    "the eye area or the outer edges of the eyes. Any headpiece sits high on the crown, well "
    "back from the eyebrows and temples. "
    "Soft even frontal beauty lighting, plain seamless neutral background, sharp focus on the "
    "eyes, high resolution. Exactly one person. No text, no watermark. "
)

# id -> (group, output path, prompt, aspect ratio, reference image or None)
JOBS: dict[str, dict] = {}


def job(jid, group, path, prompt, aspect="3:4", ref=None):
    JOBS[jid] = {"group": group, "path": path, "prompt": prompt, "aspect": aspect, "ref": ref}


# --- Part 1: the bride ------------------------------------------------------
job("face-front", "bride", "input/face-front.jpg",
    FRONT_FACE + "Her light brown hair is pulled back smoothly and completely away from "
    "her face into a neat low bun. " + BASE + NEGATIVE)

job("face-front-hairdown", "bride", "input/face-front-hairdown.jpg",
    "Using the woman in the reference image, keep her face, skin tone and hair colour "
    "exactly the same. Same studio, same lighting, same plain light grey background, same "
    "black sleeveless top. Same framing: head, shoulders and upper chest, face filling "
    "roughly half the frame height, head upright and square to camera, eyes open. "
    "Change only her hair: it is now worn loose and down, falling past her shoulders, full "
    "length and natural texture clearly visible, but swept back from her face so the "
    "forehead, temples and the skin beside both eyes stay completely clear. " + BASE,
    ref="input/face-front.jpg")

job("face-right", "bride", "input/face-right.jpg",
    "THREE-QUARTER VIEW. The woman is photographed from the side, not facing the camera. "
    "Her whole head and body are rotated about 45 degrees so that her nose points towards "
    "the right edge of the frame. The camera sees the right cheek, the right jawline and "
    "the bridge of her nose in partial profile. Her left ear is hidden behind her face and "
    "only the right ear area is towards the camera. She is NOT looking at the camera and her "
    "face is NOT symmetrical in the frame. Head upright, not tilted up or down. Eyes open. "
    "Use the woman in the reference image: same identity, same face, same fair skin, same "
    "blue-grey eyes, same light brown hair colour, same black sleeveless top, same plain light "
    "grey background, same studio lighting. "
    "Her hair is worn loose and down, falling past her shoulders, full length and natural "
    "texture clearly visible. " + BASE,
    ref="input/face-front.jpg")

job("face-left", "bride", "input/face-left.jpg",
    "THREE-QUARTER VIEW. The woman is photographed from the side, not facing the camera. "
    "Her whole head and body are rotated about 45 degrees so that her nose points towards "
    "the left edge of the frame. The camera sees the left cheek, the left jawline and "
    "the bridge of her nose in partial profile. Her right ear is hidden behind her face and "
    "only the left ear area is towards the camera. She is NOT looking at the camera and her "
    "face is NOT symmetrical in the frame. Head upright, not tilted up or down. Eyes open. "
    "Use the woman in the reference image: same identity, same face, same fair skin, same "
    "blue-grey eyes, same light brown hair colour, same black sleeveless top, same plain light "
    "grey background, same studio lighting. "
    "Her hair is worn loose and down, falling past her shoulders, full length and natural "
    "texture clearly visible. " + BASE,
    ref="input/face-front.jpg")

job("full-body", "bride", "input/full-body.jpg",
    "Using the woman in the reference image, keep her face, skin tone and hair exactly the "
    "same. "
    "Full-body photograph, head to below the feet, entire body inside the frame, nothing "
    "cropped. She stands facing the camera, upright, weight even on both feet, arms relaxed "
    "and held slightly away from her sides so the outline of her body is clearly readable. "
    "Looking at the camera. "
    "She wears a plain fitted light grey t-shirt, plain fitted dark grey trousers and plain "
    "flat shoes. Plain seamless light grey background. " + BASE +
    " Avoid: cropped feet, cropped head, arms pressed against the body, bulky or loose "
    "clothing, patterns, busy background, watermark.",
    ref="input/face-front.jpg")

job("hands", "bride", "input/hands.jpg",
    "Photorealistic close-up of a young European woman's fair-skinned hands resting on a "
    "plain light grey surface, palms down, fingers spread slightly apart and fully visible, "
    "short natural bare nails, no rings, no bracelets, no nail polish. Soft even lighting, "
    "sharp focus, high resolution.", aspect="4:3")

# --- Part 2: garment references --------------------------------------------
GARMENTS = {
    # The front must be specified CLOSED with an inner layer. An open flat-lay
    # is read literally by cloth-v4 and comes back as a bare midriff, which is
    # not how a bridal kebaya is worn and is unusable in a demo.
    "kebaya-jawa-klasik":
        "A classic Javanese bridal kebaya worn as a complete modest outfit: a long-sleeved "
        "fitted blouse in ivory lace with dense floral embroidery, fastened CLOSED at the front "
        "edge to edge with no opening and no exposed midriff, layered over an opaque ivory inner "
        "camisole so the torso is fully covered, paired below with a floor-length batik wrap skirt "
        "in traditional sogan brown and cream parang motif. Arranged flat with the closed kebaya "
        "above and the long skirt spread below it.",
    "kebaya-sunda-siger":
        "A Sundanese bridal kebaya worn as a complete modest outfit: a long-sleeved white lace "
        "blouse with fine floral embroidery, fastened CLOSED at the front with no opening and no "
        "exposed midriff, layered over an opaque white inner camisole so the torso is fully "
        "covered, paired with a floor-length gold-threaded batik wrap skirt in cream and gold. "
        "Arranged flat.",
    "baju-kurung-minang":
        "A Minangkabau bridal outfit: a loose long-sleeved tunic in deep red silk with heavy gold "
        "songket weaving at the cuffs and hem, paired with a matching red and gold songket wrap "
        "skirt, arranged flat.",
    "payas-agung-bali":
        "A Balinese payas agung bridal costume: a fitted gold brocade bodice wrap in gold and "
        "white, with a gold songket kamen wrap skirt in deep gold and red, arranged flat.",
    "baju-bodo-bugis":
        "A Bugis baju bodo: a loose short-sleeved square-cut blouse in translucent crimson silk "
        "gauze, paired with a woven sarong in deep red and gold stripes, arranged flat.",
    "ulos-batak":
        "A Batak bridal outfit: a fitted dark navy and gold brocade blouse paired with a handwoven "
        "ulos cloth in deep red, black and gold with traditional geometric stripe patterns, "
        "arranged flat with the ulos draped beside the blouse.",
}
for gid, desc in GARMENTS.items():
    job(gid, "garment", f"public/references/{gid}.jpg", GARMENT_BASE + desc, aspect="1:1")

# The two hijab looks are full outfits, so they are shot on a model.
job("kebaya-hijab-modern", "garment", "public/references/kebaya-hijab-modern.jpg",
    "Photorealistic full-body photograph of an Indonesian bride wearing a modern white hijab "
    "bridal outfit: a long-sleeved ivory lace kebaya reaching past the hips, a matching "
    "floor-length ivory skirt, and a neatly draped white hijab covering the hair, neck and chest, "
    "fastened smoothly with no hair visible. She stands facing the camera, full body in frame, "
    "head to below the feet, nothing cropped, arms relaxed slightly away from the body. Plain "
    "seamless white background, even studio lighting, sharp focus, high resolution. Exactly one "
    "person. No text, no watermark.")

job("gaun-syari-aceh", "garment", "public/references/gaun-syari-aceh.jpg",
    "Photorealistic full-body photograph of an Acehnese bride wearing a syar'i bridal gown: a "
    "loose floor-length gown in deep gold and maroon with dense gold embroidery at the cuffs, hem "
    "and neckline, worn with a long flowing hijab covering the hair, neck, shoulders and chest "
    "completely. She stands facing the camera, full body in frame, head to below the feet, nothing "
    "cropped. Plain seamless white background, even studio lighting, sharp focus, high resolution. "
    "Exactly one person. No text, no watermark.")

# --- Part 3: regional makeup references ------------------------------------
MAKEUPS = {
    "paes-ageng-jogja":
        "Yogyakarta paes ageng bridal makeup: the traditional dark paes shapes painted on the "
        "forehead along the hairline, gold prada outlining them, bold defined eyebrows shaped like "
        "antelope horns, deep warm bronze and gold eyeshadow, black winged eyeliner, and deep red "
        "lips. The hair is dressed smoothly back into a traditional bun. The gold ornaments sit "
        "high on the crown, clearly separated from the eyebrows, and the temples remain bare.",
    "makeup-sunda-siger":
        "Sundanese bridal makeup: soft warm-toned complexion, delicate gold-brown eyeshadow, "
        "defined but softly curved eyebrows, black eyeliner, and warm rose lips. The hair is dressed "
        "smoothly back. A gold siger crown rests high on the crown of the head, well above and "
        "clearly separated from the eyebrows, with the forehead and temples fully exposed.",
    "makeup-minang-suntiang":
        "Minangkabau bridal makeup: warm golden complexion, rich bronze and gold eyeshadow, strong "
        "defined eyebrows, black eyeliner, and deep red lips. The hair is dressed smoothly back. The "
        "tiered gold suntiang headpiece sits high above the forehead, raised and clearly separated "
        "from the eyebrows and temples, with no ornament falling beside the eyes.",
    "makeup-bali-payas":
        "Balinese payas agung bridal makeup: luminous warm complexion, softly blended gold and "
        "bronze eyeshadow, defined arched eyebrows, black eyeliner, and rich red lips. The hair is "
        "dressed smoothly back. Gold ornaments and frangipani flowers sit high on the crown, well "
        "back from the eyebrows, with the forehead and temples completely clear.",
    "makeup-betawi-none":
        "Betawi bridal makeup: fresh warm complexion, soft coral and gold eyeshadow, softly defined "
        "eyebrows, black eyeliner, and bright red lips. The hair is dressed smoothly back into a "
        "neat bun with the forehead and temples fully exposed, no ornament near the eyes.",
}
for mid, desc in MAKEUPS.items():
    job(mid, "makeup", f"public/references/{mid}.jpg", MAKEUP_BASE + desc)


def gcloud(*args: str) -> str:
    return subprocess.run(
        ["gcloud", *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def generate(spec: dict, token: str, project: str) -> bytes:
    parts: list[dict] = []

    if spec["ref"]:
        ref_path = ROOT / spec["ref"]
        if not ref_path.exists():
            raise RuntimeError(f"reference {spec['ref']} missing — generate it first")
        parts.append({
            "inlineData": {
                "mimeType": "image/jpeg",
                "data": base64.b64encode(ref_path.read_bytes()).decode(),
            }
        })

    parts.append({"text": spec["prompt"]})

    body = json.dumps({
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": spec["aspect"]},
        },
    }).encode()

    url = (f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{project}"
           f"/locations/{LOCATION}/publishers/google/models/{MODEL}:generateContent")
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })

    # The endpoint rate-limits readily on a burst. Back off rather than losing
    # the whole batch to one 429.
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as err:
            if err.code in (429, 503) and attempt < 4:
                wait = 15 * (attempt + 1)
                print(f"        {err.code}, retrying in {wait}s")
                time.sleep(wait)
                continue
            raise

    if isinstance(payload, list):
        payload = payload[0]

    for cand in payload.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            if "inlineData" in part:
                return base64.b64decode(part["inlineData"]["data"])
        reason = cand.get("finishReason")
        if reason and reason != "STOP":
            raise RuntimeError(f"blocked or incomplete: {reason}")

    raise RuntimeError(f"no image returned: {str(payload)[:200]}")


def save(raw: bytes, dest: Path) -> tuple[int, int]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    tmp.write_bytes(raw)
    with Image.open(tmp) as im:
        im = im.convert("RGB")
        scale = MAX_SIDE / max(im.size)
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=93)
        size = im.size
    tmp.unlink()
    return size


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="asset ids to generate")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--group", choices=["bride", "garment", "makeup"])
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--force", action="store_true", help="regenerate even if the file exists")
    args = ap.parse_args()

    if args.list:
        for jid, spec in JOBS.items():
            exists = "✓" if (ROOT / spec["path"]).exists() else " "
            print(f" {exists} {jid:<24} {spec['group']:<8} {spec['path']}")
        return 0

    if args.all:
        targets = list(JOBS)
    elif args.group:
        targets = [j for j, s in JOBS.items() if s["group"] == args.group]
    else:
        targets = args.ids

    if not targets:
        ap.error("give asset ids, or --group, or --all (see --list)")

    unknown = [t for t in targets if t not in JOBS]
    if unknown:
        ap.error(f"unknown ids: {', '.join(unknown)}")

    # face-front seeds the identity for the other bride shots, so it goes first.
    targets.sort(key=lambda t: (JOBS[t]["ref"] is not None, t))

    token = gcloud("auth", "application-default", "print-access-token")
    project = gcloud("config", "get-value", "project")
    print(f"project {project}, model {MODEL}\n")

    made = skipped = failed = 0
    for jid in targets:
        spec = JOBS[jid]
        dest = ROOT / spec["path"]
        if dest.exists() and not args.force:
            print(f"  skip  {jid:<24} already exists")
            skipped += 1
            continue
        try:
            raw = generate(spec, token, project)
            w, h = save(raw, dest)
            print(f"  ok    {jid:<24} {w}x{h}  {spec['path']}")
            made += 1
        except Exception as exc:  # noqa: BLE001 - report and keep going
            print(f"  FAIL  {jid:<24} {exc}")
            failed += 1

    print(f"\n{made} generated, {skipped} skipped, {failed} failed")
    if made:
        print(f"approx cost: ${made * 0.04:.2f}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
