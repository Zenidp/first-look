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

job("face-front-smile", "bride", "input/face-front-smile.jpg",
    "Using the woman in the reference image, keep her face, skin tone, hair and hairstyle "
    "exactly the same. Same studio, same lighting, same plain light grey background, same "
    "black sleeveless top, same framing and head position. "
    "Change only her expression: she now smiles openly with her lips parted, showing a full "
    "row of upper front teeth clearly and unobstructed. Eyes open. " + BASE,
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
        "songket weaving at the cuffs and hem, closed across the front with a solid unbroken front "
        "panel and no opening, so the torso is fully covered from the neckline to the hip, paired "
        "with a matching floor-length red and gold songket wrap skirt. Arranged flat.",
    "payas-agung-bali":
        "A Balinese payas agung bridal costume: a fitted gold brocade bodice in gold and white that "
        "wraps closed across the chest and stomach with a solid unbroken front and no opening or "
        "exposed midriff, worn with a floor-length gold songket kamen wrap skirt in deep gold and "
        "red. Arranged flat.",
    "baju-bodo-bugis":
        "A Bugis baju bodo: a loose short-sleeved square-cut blouse in crimson silk, opaque and "
        "closed all the way round with a solid unbroken front so the torso is fully covered to "
        "below the hip, worn over a floor-length woven sarong in deep red and gold stripes. "
        "Arranged flat.",
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

# --- Hand shots for ring and bracelet ---------------------------------------
# The generic two-hand photo fails both: ring VTO answered "Hand pose should be
# correct" and bracelet "Wrist size should fit in range". One hand, and the
# wrist inside the frame at a usable size, are what these need.
job("hand-nails", "bride", "input/hand-nails.jpg",
    "Photorealistic macro close-up of the fingers of ONE single left hand of a young "
    "European woman with fair skin, back of the hand towards the camera, fingers held "
    "together and pointing up, cropped so that only the fingers from the middle knuckles "
    "upwards fill the entire frame. The FINGERNAILS are large and dominant in the image, "
    "each nail clearly visible, medium length, natural bare nails with no polish and no "
    "rings. Plain seamless light grey background, soft even studio lighting, sharp focus, "
    "high resolution. Only one hand, no face, no text, no watermark.", aspect="3:4")

job("hand-ring", "bride", "input/hand-ring.jpg",
    "Photorealistic close-up of ONE single left hand of a young European woman with fair "
    "skin, back of the hand towards the camera, held upright with the fingers pointing "
    "gently upwards and slightly spread apart, all four fingers and the thumb fully visible "
    "and unobstructed, the wrist included at the bottom of the frame. Short natural bare "
    "nails, no rings, no bracelets, no nail polish. The hand fills most of the frame. "
    "Plain seamless light grey background, soft even studio lighting, no harsh shadows, "
    "sharp focus, high resolution. Only one hand in the image, no second hand, no face, "
    "no text, no watermark.", aspect="3:4")

job("hand-bracelet", "bride", "input/hand-bracelet.jpg",
    "Photorealistic close-up of ONE single left forearm and hand of a young European woman "
    "with fair skin, the arm held UPRIGHT and VERTICAL, rising from the bottom of the frame, "
    "with the BACK OF THE HAND and the front of the wrist facing the camera straight on. "
    "The fingers point upwards, relaxed and slightly apart. The WRIST is centred in the "
    "frame, facing the camera directly rather than edge-on, unobstructed, with several "
    "centimetres of bare forearm below it. No sleeve, no watch, no bracelet, no rings, no "
    "nail polish. Plain seamless light grey background, soft even studio lighting, sharp "
    "focus, high resolution. Only one arm in the image, no second hand, no face, no text, "
    "no watermark.", aspect="3:4")


# --- Jewellery product shots (for the 2D VTO suite) -------------------------
# These endpoints take a product cut-out, not a worn photo. Background removal
# is automatic, but a clean isolated product on white gives the segmenter the
# easiest job.
JEWELLERY_BASE = (
    "Photorealistic e-commerce product photograph of a single piece of bridal jewellery, "
    "centred on a plain seamless pure white background, shot straight on, the entire item "
    "inside the frame with nothing cropped, even diffuse studio lighting, no harsh shadows "
    "and no reflections on the background, metal and stones sharply in focus, high "
    "resolution. No person, no hand, no model, no mannequin, no box, no props, no text, "
    "no watermark. "
)

JEWELLERY = {
    "earring-gold-drop":
        "A single gold bridal drop earring: an ornate filigree gold stud at the top with a "
        "teardrop pendant hanging below, set with small white pearls, shown upright and "
        "isolated.",
    "necklace-gold-collar":
        "A gold bridal collar necklace: a wide ornate filigree gold necklace set with small "
        "white pearls and clear stones, laid out open in a horseshoe shape so the whole "
        "necklace is visible.",
    "ring-gold-solitaire":
        "A gold bridal solitaire ring: a polished yellow gold band with a single round "
        "brilliant-cut diamond in a raised setting, shown upright from the front.",
    # A face-on flat cuff gives the engine nothing to anchor to and lands as a
    # sticker on the forearm. It needs a CLOSED bangle shot at an angle from
    # above so the inner opening is visible — the two farthest points of that
    # opening are what the anchor points refer to.
    "bracelet-gold-cuff":
        "A gold bridal bangle bracelet: a closed circular yellow gold bangle with ornate "
        "filigree engraving and small white pearls set into the band. Photographed at a "
        "three-quarter angle from slightly above so the ring shape is seen in perspective "
        "as an ellipse and the INNER OPENING of the bangle is clearly visible through the "
        "middle, with the inner wall of the far side of the band showing. The whole bangle "
        "is inside the frame, nothing cropped.",
}
for jid, desc in JEWELLERY.items():
    job(jid, "jewellery", f"public/references/{jid}.jpg", JEWELLERY_BASE + desc, aspect="1:1")


job("lens-hazel", "jewellery", "public/references/lens-hazel.jpg",
    "Photorealistic extreme close-up product photograph of a single coloured contact lens "
    "iris pattern, shown as a perfect circle filling the frame, centred, with a solid black "
    "pupil in the middle. The iris is a warm hazel-green with fine radiating fibre detail and "
    "a darker limbal ring around the outer edge. Plain white background outside the circle. "
    "Sharp focus, high resolution, even lighting. No eye, no eyelashes, no skin, no face, "
    "no text, no watermark.", aspect="1:1")


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
    ap.add_argument("--group", choices=["bride", "garment", "makeup", "jewellery"])
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
