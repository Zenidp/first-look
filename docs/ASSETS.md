# Shooting and sourcing guide

Exactly what images this app needs, what the API accepts, and where each file
goes. Every limit below was measured against the live API, not copied from the
docs — see `FINDINGS.md` §2 for the raw evidence.

---

## The rule that makes this worth reading

A task the engine rejects **on content** has already been created and billed.
Only failures rejected at creation time (HTTP 400) are free. So a photo that
does not meet spec costs 1–2 units to discover.

Shoot to spec once and you spend nothing on retries.

---

## Universal limits — every endpoint

| | |
|---|---|
| Format | **jpg / jpeg only** (png accepted by makeup transfer only) |
| File size | under 10 MB |
| Long side | **max 1024 px** |
| Faces | exactly one, no other people in frame |

The app downscales to 1024px in the browser before upload, so you can shoot at
full resolution. It does **not** upscale, so do not shoot small: a photo
smaller than 1024px on its long side is stuck at that size, and the makeup
endpoints will reject it.

**Shoot at least 1500px on the long side, then let the app downscale.**

---

## Part 1 — Photos of the bride (to regenerate fixtures)

You need **four** photos. Different endpoints want incompatible framings, which
is why one photo cannot cover everything.

### Photo 1 — Face portrait `face-front.jpg`

The workhorse. Drives makeup, hair, jewellery and the front-facing diagnostic.

- **Framing:** head, shoulders and upper chest. Face fills roughly **half the
  frame height**.
- **Shoulders must be visible** — the hair endpoint fails with
  `error_no_shoulder` without them.
- Straight at the camera. Tolerance is tight: pitch −10°..+10°, yaw −45°..+45°,
  roll −15°..+15°. Beyond that: `error_large_face_angle`.
- **Eyes open**, not squinting, nothing across them.
- **Lips unobstructed** — no hand, hair or object.
- **Hair pulled clear of the eyes and temples.** This is the single most common
  rejection: `error_inappropriate_ref_case01` fires when hair sits too close to
  the eye or there is too little skin beside the outer corner.
- Plain, evenly lit background. Soft frontal light, no hard shadow across the
  face.
- No glasses, no heavy existing makeup if you want the makeup try-on to read
  clearly.

**Why the face must be big:** a 355×436 portrait was rejected outright by
Makeup Transfer with `error_src_face_too_small`. The same shot upscaled to
834×1024 passed. Hair and jewellery are far more forgiving (face width ≥128px
is enough) but Makeup Transfer sets the bar for all of them.

### Photos 2 and 3 — Right and left `face-right.jpg`, `face-left.jpg`

Only for hair type and hair frizziness detection, which take **exactly three
photos in the order front, right, left**.

- Same lighting, same distance, same session as Photo 1.
- Turn the head roughly 45°, do not tilt.
- Hair fully visible — these read hair texture and frizz, so do not tie it back.

### Photo 4 — Full body `full-body.jpg`

For outfit try-on with `garment_category: "full_body"` (kebaya, gown).

- Whole body in frame, head to below the feet, standing, facing the camera.
- Arms relaxed and slightly away from the body so the silhouette is readable.
- Fitted or plain clothing. A bulky current outfit confuses the garment fit.
- Plain background, no other people.

### Optional — Photo 5 `hands.jpg`

Only if you want ring, bracelet or nail try-on in the demo. Hand in frame,
fingers separated, plain background.

---

## Part 2 — The Nusantara reference library

These are the *style* images: the kebaya, the hijab look, the regional makeup.
They are not photos of the bride.

Two very different specs depending on what the slot feeds.

### Garment references → `use: "clothes"`

Feeds cloth-v4, which composites the garment onto the bride's real photo. This
path is verified working.

- The garment is the subject. **Flat-lay** on a plain surface, or **on a model**
  shot full body.
- Whole garment visible, not cropped.
- Plain background, even light, no heavy shadow.
- If on a model, one person only, standing, facing camera.
- jpg, long side ≤ 1024px after downscale.

Hijab looks belong here. **Never route hijab through the `scarf` feature** — it
generates an entirely new scene instead of dressing the photo (`FINDINGS.md` §1).

### Makeup references → `use: "makeupTransfer"`

Feeds mu-transfer, **the strictest endpoint on the platform**. It validates the
reference as carefully as the bride's own photo, with a separate error code for
each side.

Every requirement from Photo 1 applies, and harder:

- High resolution. Face fills most of a 1024px frame.
- Dead frontal. Eyes open, unobstructed. Lips unobstructed.
- **Clear skin visible beside the outer eye corners**, hair well clear of the
  eye area.

This is a genuine problem for Indonesian bridal makeup. Paes ageng, suntiang
and payas agung all place elaborate headpieces tight against the hairline and
temples — exactly what triggers `error_inappropriate_ref_case01`. When
selecting or commissioning these, favour frames where the forehead and temples
are open and the eye area is unobstructed, even if that means a less dramatic
headpiece angle.

A reference the API refuses is worth nothing, however beautiful.

### The 13 slots

Filename is always `public/references/<id>.jpg`.

| Filename | Feeds | Region | What it is |
|---|---|---|---|
| `kebaya-jawa-klasik.jpg` | clothes | Jawa | Kebaya Jawa klasik |
| `kebaya-sunda-siger.jpg` | clothes | Sunda | Kebaya Sunda |
| `baju-kurung-minang.jpg` | clothes | Minang | Baju kurung Minang |
| `payas-agung-bali.jpg` | clothes | Bali | Payas agung Bali |
| `baju-bodo-bugis.jpg` | clothes | Bugis | Baju bodo Bugis |
| `ulos-batak.jpg` | clothes | Batak | Ulos Batak |
| `kebaya-hijab-modern.jpg` | clothes | Nasional | Kebaya hijab modern |
| `gaun-syari-aceh.jpg` | clothes | Aceh | Gaun syar'i Aceh |
| `paes-ageng-jogja.jpg` | makeupTransfer | Jawa | Paes ageng Yogyakarta |
| `makeup-sunda-siger.jpg` | makeupTransfer | Sunda | Makeup pengantin Sunda |
| `makeup-minang-suntiang.jpg` | makeupTransfer | Minang | Makeup Minang suntiang |
| `makeup-bali-payas.jpg` | makeupTransfer | Bali | Makeup payas agung Bali |
| `makeup-betawi-none.jpg` | makeupTransfer | Betawi | Makeup pengantin Betawi |

You do not need all 13. Three or four strong regions demo better than thirteen
weak ones. Slots with no image stay hidden automatically.

### Licensing — this is enforced, not advisory

A slot goes live only when **all three** exist: the image file, a `credit`, and
a `license` in `src/lib/references.ts`. A file with no attribution stays
invisible. That is deliberate.

Do not use Perfect Corp's sample or template images. Their terms (§11.1, §8.1,
§8.6(r)) reserve all rights in their content. Use photographs you own, ones
licensed for the purpose, or ones a MUA has given you written permission to
use — and record which, in the `license` field.

---

## Part 3 — Where the files go

```
FristLook/
├── input/                     ← YOUR PHOTOS. git-ignored, never committed.
│   ├── face-front.jpg
│   ├── face-right.jpg
│   ├── face-left.jpg
│   ├── full-body.jpg
│   └── hands.jpg              (optional)
│
├── public/references/         ← Nusantara library. COMMITTED.
│   ├── kebaya-jawa-klasik.jpg
│   ├── paes-ageng-jogja.jpg
│   └── …
│
├── fixtures/                  ← generated automatically. COMMITTED.
└── public/fixtures/           ← generated automatically. COMMITTED.
```

`input/` is git-ignored on purpose: the bride's photographs are personal, and
the repo may go public. The *outputs* in `fixtures/` are committed so the
deployed demo can replay them without spending credits.

Note that committed fixtures will show her face on a public repo and in the
demo video. If that is a real person other than you, get their agreement first.

---

## Part 4 — Regenerating the fixtures

The fixtures currently committed were made from a Perfect Corp template
thumbnail, because the sample selfie URL in their docs 404s. They must not
ship. See `fixtures/README.md`.

```bash
# 1. Clear the old ones
rm -f fixtures/*.json public/fixtures/*.jpg

# 2. Run the app and walk each look you intend to demo
npm run dev          # then open http://localhost:3000/test

# 3. Verify nothing broke, spending nothing
npm run build
PERFECTCORP_OFFLINE=1 npm start &
PHOTO=./input/face-front.jpg npm run smoke

# 4. Ship
git add fixtures public/fixtures && git commit -m "chore: regenerate fixtures from owned photos"
git push
```

Budget roughly **2 units per look**. Only generate what the demo video actually
shows — the deployed app replays fixtures but a cache miss in production still
makes a real, billable call.

Once the fixtures are yours, the repo is safe to make public:

```bash
gh repo edit Zenidp/first-look --visibility public --accept-visibility-change-consequences
```
