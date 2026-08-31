# Generating the image assets with Gemini

Copy-paste prompts for every image `ASSETS.md` asks for, with the API's
measured constraints already written into them.

Read `ASSETS.md` first for *why* each constraint exists. This file is the
execution layer.

---

## Read this before generating anything

### What AI generation solves

Using a synthetic bride removes two real problems at once: nobody's consent is
needed, and the fixtures become safe to commit and safe to show in the demo
video. That is strictly better than photographing a real person for this.

> The demo bride in Part 1 is described as European, a deliberate marketing
> call by the project owner. Worth re-examining before the submission: CONTEXT
> §2 frames the problem as brides working from Pinterest screenshots of *other
> people's faces*, and the product's answer is seeing the look on her own. A
> demo bride who does not resemble the target customer weakens that argument in
> front of judges scoring Concept, and the buyer is an Indonesian MUA. The
> reference libraries in Parts 2 and 3 stay Indonesian regardless — see the note
> under Part 2 for why that costs nothing.

### What it does not solve

**1. Identity consistency across four photos.**
The three-photo diagnostic set (front, right, left) must be *the same person*
in the same lighting, and the full-body shot should be her too. Text-to-image
models drift: same prompt, different face. Handle it with the reference-image
workflow in Part 1 rather than four independent generations.

**2. Cultural accuracy.**
Image models are unreliable on Indonesian regional bridal detail. They tend to
produce a generic pan-Asian "traditional bride" and confidently mislabel it.
Paes ageng, suntiang, siger and payas agung each have specific, non-negotiable
elements — a wrong one is not a neutral mistake in a product built for
Indonesian MUAs, it is the exact error your users are trained to spot.

**Have an MUA look at the regional makeup images before you ship them.** If one
cannot be verified, leave that slot empty. A missing region is honest; a wrong
one is not. Slots with no image hide themselves automatically.

**3. Whether the API accepts them.**
Generate **one** image first — `face-front` — and run it through `/test` before
generating the rest. If a synthetic face trips `error_no_face` or
`error_src_face_too_small`, you want to know that after one image, not
seventeen.

---

## Global settings

| Setting | Value | Why |
|---|---|---|
| Aspect ratio | **3:4 portrait** for faces and garments-on-model; **1:1** for flat-lay | Matches how the API crops |
| Resolution | **Highest available.** Aim past 1500px on the long side | The app downscales to 1024 but never upscales, and the makeup endpoints reject small faces |
| Output | Save as **.jpg** | jpg/jpeg only |
| Style | Photorealistic. Not illustration, not 3D render, not stylised | |

### The base block

Every prompt below assumes this. Append it, or lead with it:

```
Photorealistic professional photograph, shot on a full-frame camera with an
85mm lens, natural soft studio lighting from the front, no harsh shadows on
the face, plain seamless light grey or cream background, sharp focus, high
resolution, true-to-life skin texture with visible pores, neutral colour
grading. Exactly one person in frame. No text, no watermark, no logo, no
border, no collage.
```

### Universal negatives

```
Avoid: multiple people, cropped head, tilted head, closed or squinting eyes,
sunglasses, hand or hair covering the face, heavy shadow across the face,
motion blur, extreme wide angle, fisheye distortion, busy or cluttered
background, text overlays, watermarks, split or collage layouts.
```

---

## Part 1 — The bride, four photos

### Step 1: generate `face-front.jpg` first

This one sets the identity. Everything else references it.

```
Photorealistic head-and-shoulders portrait of a beautiful 27-year-old European
woman looking straight into the camera. Fair skin with a light natural flush,
blue-grey eyes, light brown hair pulled back smoothly and completely away from
her face, forehead and temples fully exposed, both ears visible, no strands
falling near the eyes. Symmetrical features, high cheekbones, clear complexion.
Bare face, no makeup. Calm closed-mouth expression, lips relaxed and fully
visible. Both eyes wide open and clearly visible.

Framing: head, shoulders and upper chest visible. Her face fills roughly half
the height of the frame. Shoulders clearly in frame and not cropped. Head
perfectly upright and square to the camera, no tilt, no turn.

She wears a plain black fitted sleeveless top.

Photorealistic professional photograph, 85mm lens, soft even frontal studio
lighting, plain seamless light grey background, sharp focus, high resolution,
natural skin texture. Exactly one person.

Avoid: makeup, jewellery, glasses, hair near the eyes or temples, tilted head,
turned head, closed eyes, cropped shoulders, busy background, watermark, text.
```

**Check it against these before continuing.** All must be true:
- shoulders visible
- face fills about half the frame height
- head square-on, no tilt
- eyes open, lips unobstructed
- **no hair anywhere near the eyes or outer eye corners**

Now run it through `/test` on the hair try-on. If it works, continue.

### Step 2: the two side angles

Feed `face-front.jpg` back into Gemini as a reference image so the face carries
over, then:

**`face-right.jpg`**
```
Using the woman in the reference image, keep her face, skin tone, hair colour
and hair length exactly the same. Same studio, same lighting, same plain light
grey background, same black sleeveless top.

Change only the angle: she turns her head about 45 degrees to her right, so the
camera sees the right side of her face. Head upright, not tilted. Eyes open.

Her hair is now worn loose and down, fully visible, natural texture, falling
past her shoulders — the full length and texture of the hair must be clearly
visible.

Photorealistic, 85mm lens, soft even lighting, sharp focus, high resolution.
```

**`face-left.jpg`** — identical, with "45 degrees to her left, so the camera
sees the left side of her face."

> The diagnostics read hair texture, frizz and length off these. Hair must be
> **down and clearly visible** in all three, so regenerate `face-front` with
> loose hair too if you plan to run hair type or frizziness detection — that
> conflicts with the makeup requirement of hair clear of the eyes, so keep two
> front shots: one with hair back for makeup, one with hair down for diagnostics.

### Step 3: `full-body.jpg`

```
Using the woman in the reference image, keep her face, skin tone and hair
exactly the same.

Full-body photograph, head to below the feet, entire body inside the frame,
nothing cropped. She stands facing the camera, upright, weight even on both
feet, arms relaxed and held slightly away from her sides so the outline of her
body is clearly readable. Looking at the camera.

She wears a plain fitted light grey t-shirt and plain fitted dark grey
trousers, and plain flat shoes.

Photorealistic full-length studio photograph, even lighting, plain seamless
light grey background, sharp focus, high resolution, 3:4 portrait orientation.
Exactly one person.

Avoid: cropped feet, cropped head, arms pressed against the body, bulky or
loose clothing, patterns, busy background, watermark.
```

Plain fitted clothing matters: the garment engine has to replace what she is
wearing, and a bulky outfit confuses the silhouette.

### Optional `hands.jpg`

Only if rings, bracelets or nails appear in the demo.

```
Photorealistic close-up of a young European woman's fair-skinned hands resting
on a plain light grey surface, palms down, fingers spread slightly apart and
fully visible, short natural bare nails, no rings, no bracelets, no nail
polish.
Soft even lighting, sharp focus, high resolution.
```

---

## Part 2 — Garment references (8 slots)

These feed `cloth-v4`, which composites the garment onto her real photo.

> **Why these still describe Indonesian models while the bride in Part 1 does
> not.** The reference model never appears in the output. `cloth-v4` transfers
> only the garment onto the bride's photo, and `mu-transfer` transfers only the
> makeup — verified on both. So changing the reference model's appearance buys
> nothing visible to a viewer, while costing accuracy: a kebaya or a paes ageng
> rendered on a Northern European face is the kind of detail an image model gets
> wrong in ways an MUA notices immediately. The bride is the face that sells;
> these are pattern sources.

**Shared instruction — prepend to each:**
```
Photorealistic e-commerce product photograph of a traditional Indonesian
garment, presented flat and centred on a plain seamless white background, shot
from directly above, the entire garment inside the frame with nothing cropped,
even diffuse lighting with no harsh shadows, fabric texture and embroidery
clearly visible, sharp focus, high resolution, 1:1 square. No person, no
mannequin head, no text, no watermark, no props.
```

Then the garment itself:

**`kebaya-jawa-klasik.jpg`**
```
A classic Javanese bridal kebaya: a long-sleeved fitted blouse in ivory lace
with dense floral embroidery, paired below with a batik sarong in traditional
sogan brown and cream parang or truntum motif, arranged flat with the kebaya
above and the sarong spread below it.
```

**`kebaya-sunda-siger.jpg`**
```
A Sundanese bridal kebaya: a long-sleeved white lace blouse with fine floral
embroidery and a slightly longer front panel, paired with a gold-threaded batik
sarong in cream and gold, arranged flat.
```

**`baju-kurung-minang.jpg`**
```
A Minangkabau bridal outfit: a loose long-sleeved tunic in deep red silk with
heavy gold songket weaving at the cuffs and hem, paired with a matching red and
gold songket wrap skirt, arranged flat.
```

**`payas-agung-bali.jpg`**
```
A Balinese payas agung bridal costume: a fitted gold brocade bodice wrap in
gold and white, with a gold songket kamen wrap skirt in deep gold and red,
arranged flat.
```

**`baju-bodo-bugis.jpg`**
```
A Bugis baju bodo: a loose short-sleeved square-cut blouse in translucent
crimson silk gauze, paired with a woven sarong in deep red and gold stripes,
arranged flat.
```

**`ulos-batak.jpg`**
```
A Batak bridal outfit: a fitted dark navy and gold brocade blouse paired with a
handwoven ulos cloth in deep red, black and gold with traditional geometric
stripe patterns, arranged flat with the ulos draped beside the blouse.
```

**`kebaya-hijab-modern.jpg`** — *this is a full look, so shoot it on a model*
```
Photorealistic full-body photograph of an Indonesian bride wearing a modern
white hijab bridal outfit: a long-sleeved ivory lace kebaya reaching past the
hips, a matching floor-length ivory skirt, and a neatly draped white hijab
covering the hair, neck and chest, fastened smoothly with no hair visible.

She stands facing the camera, full body in frame, head to below the feet,
nothing cropped, arms relaxed slightly away from the body. Plain seamless white
background, even studio lighting, sharp focus, high resolution, 3:4 portrait.
Exactly one person. No text, no watermark.
```

**`gaun-syari-aceh.jpg`**
```
Photorealistic full-body photograph of an Acehnese bride wearing a syar'i
bridal gown: a loose floor-length gown in deep gold and maroon with dense gold
embroidery at the cuffs, hem and neckline, worn with a long flowing hijab
covering the hair, neck, shoulders and chest completely.

She stands facing the camera, full body in frame, head to below the feet,
nothing cropped. Plain seamless white background, even studio lighting, sharp
focus, high resolution, 3:4 portrait. Exactly one person.
```

---

## Part 3 — Regional makeup references (5 slots)

**This is the hardest part, technically and culturally.**

These feed `mu-transfer`, the strictest endpoint on the platform. It validates
the reference as carefully as the bride's own photo, and it fails specifically
on the thing traditional Indonesian bridal styling does most:
**headpieces and ornaments pressed tight against the hairline and temples.**

Measured failure: an upscaled thumbnail was rejected with
`error_inappropriate_ref_case01` — *hair too close to the eye, or too little
skin beside the outer eye corner*.

**So every prompt below deliberately pulls the ornament back off the temples.**
This makes the image slightly less dramatic than a real bridal photograph. That
is intentional and necessary — an unusable reference is worth nothing.

**Shared instruction — prepend to each:**
```
Photorealistic beauty close-up portrait of an Indonesian woman looking straight
into the camera, head upright and perfectly square to the camera, no tilt, no
turn. Both eyes wide open and fully visible. Lips closed, relaxed and fully
visible. Her face fills most of the frame.

The skin at her temples and beside the outer corners of both eyes is completely
clear and visible — no hair, no ornament, no jewellery and no fabric touching
or overlapping the eye area or the outer edges of the eyes. Any headpiece sits
high on the crown, well back from the eyebrows and temples.

Soft even frontal beauty lighting, plain seamless neutral background, sharp
focus on the eyes, high resolution, 3:4 portrait. Exactly one person. No text,
no watermark.
```

Then the look:

**`paes-ageng-jogja.jpg`**
```
Yogyakarta paes ageng bridal makeup: the traditional dark paes shapes painted
on the forehead along the hairline, gold prada outlining them, bold defined
eyebrows shaped like antelope horns, deep warm bronze and gold eyeshadow, black
winged eyeliner, and deep red lips. The hair is dressed smoothly back into a
traditional bun. The gold ornaments sit high on the crown, clearly separated
from the eyebrows, and the temples remain bare.
```

**`makeup-sunda-siger.jpg`**
```
Sundanese bridal makeup: soft warm-toned complexion, delicate gold-brown
eyeshadow, defined but softly curved eyebrows, black eyeliner, and warm rose
lips. The hair is dressed smoothly back. A gold siger crown rests high on the
crown of the head, well above and clearly separated from the eyebrows, with the
forehead and temples fully exposed.
```

**`makeup-minang-suntiang.jpg`**
```
Minangkabau bridal makeup: warm golden complexion, rich bronze and gold
eyeshadow, strong defined eyebrows, black eyeliner, and deep red lips. The hair
is dressed smoothly back. The tiered gold suntiang headpiece sits high above
the forehead, raised and clearly separated from the eyebrows and temples, with
no ornament falling beside the eyes.
```

**`makeup-bali-payas.jpg`**
```
Balinese payas agung bridal makeup: luminous warm complexion, softly blended
gold and bronze eyeshadow, defined arched eyebrows, black eyeliner, and rich
red lips. The hair is dressed smoothly back. Gold ornaments and frangipani
flowers sit high on the crown, well back from the eyebrows, with the forehead
and temples completely clear.
```

**`makeup-betawi-none.jpg`**
```
Betawi bridal makeup: fresh warm complexion, soft coral and gold eyeshadow,
softly defined eyebrows, black eyeliner, and bright red lips. The hair is
dressed smoothly back into a neat bun with the forehead and temples fully
exposed, no ornament near the eyes.
```

### Before you use these

Show them to an MUA who works in that tradition. Ask one question: *is this
recognisably correct for this region, or is it generic?* Keep only the ones
that pass. Leave the rest empty.

---

## After generating

1. Save each file with the **exact filename** from `ASSETS.md` — the app matches
   on the filename.
2. Bride photos go in `input/` (git-ignored). Reference images go in
   `public/references/` (committed).
3. Fill in `credit` and `license` for every reference slot in
   `src/lib/references.ts` — a slot with no attribution stays hidden. For these,
   something like:

   ```ts
   credit: "Generated with Google Gemini, 1 Sep 2026",
   license: "AI-generated for this project; no third-party rights",
   ```

   If an MUA verified the look, say so in `credit` too — it is worth more to a
   judge than the generation tool.

4. Restart `npm run dev` and check `/api/references` — `readyCount` should rise.
5. Test one image per category before generating the whole set. Each rejection
   the engine makes on content costs units.
