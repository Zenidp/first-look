# Perfect Corp API — measured findings

Everything here was **observed by running the API**, not read from the docs.
Where the docs say something different, or say nothing at all, that is noted.
Dates matter: the platform is at v1.15 and moving.

Measured 30 August – 1 September 2026 against `https://yce-api-01.makeupar.com`.

---

## 1. The `styled` fashion family generates a new scene. It is not a try-on.

**This is the most consequential finding in this document and it is documented
nowhere upstream.**

`scarf`, `hat`, `shoes` and `bag` (all V2.0, all requiring a mandatory
`gender` field and accepting an optional `style` hint) do **not** edit the
photo you send. They generate a new photograph.

### What was sent

A 355×436 head-and-shoulders studio portrait, plain cream background, and a
flat pink striped fabric swatch as the reference.

### What came back

A 896×1152 full-body photograph of a woman in a **dark red wool coat, white
shirt and black trousers**, one hand on a **stone wall**, standing on a
**cobbled street under yellow autumn leaves**, wearing a **red-white-black
chevron knit scarf** that was not the fabric supplied.

Everything except an approximation of the face was invented: the framing, the
crop, the aspect ratio, the background, the season, the pose, and every
garment other than the scarf itself.

### Why it matters

CONTEXT §1 promises a look board built "on the bride's actual face". These
four endpoints break that promise completely. Output from this family must
never be composited into the look board or shown beside true try-on results —
the bride would see a stranger's body and a street she has never visited.

It also means **the hijab route via `scarf` does not work** for this product.
Hijab has to go through `clothes` (cloth-v4) with a reference photo instead,
which was verified to composite correctly (see §2).

### Every other family composites correctly

Verified individually: `hybrid` (hair style), `template` (makeup look, wedding
gown), `reference` (makeup transfer), `garment` (cloth-v4), `jewelry`
(earrings), `preset` (hair colour). All of them preserve the exact frame,
background, crop and face of the uploaded photo, and change only the thing you
asked them to change.

### The opportunity hiding inside it

A scene generator is the wrong tool for a look board and a **plausible tool for
a separate feature**. Indonesian couples routinely pay for *prewedding*
photoshoots — concept, location, wardrobe, styling — booked and argued over
months in advance, exactly like the trial makeup this product exists to fix.

A "prewedding concept preview" built on this family would:

- reuse an API already integrated, at 2 units per concept;
- address a second real spending decision made blind;
- open a referral line to photographers and venues, which strengthens the
  Feasibility score the judges explicitly ask about.

It must be labelled unmistakably as an AI-generated concept, never as her
photo.

**Built on 31 Aug 2026** — `src/lib/concepts.ts`, `/api/concepts`,
`/prewedding`. Two further measurements made it workable:

1. **`ref_file_id` is required at runtime** even though the OpenAPI schema
   marks only `gender` as required. Omitting it returns
   `400 InvalidParameters` — rejected at creation, so no units are spent.
2. **The reference image is nearly inert.** An identical plain ivory swatch
   produced completely different photographs depending only on `style`:

   | `style` | Result |
   |---|---|
   | `style_bohemian` | Lakeside at golden hour, straw hat, white flowy dress, grass and water |
   | `style_french_elegance` | Blossom-lined café street, black long coat, cream trousers, dusk |
   | `style_vacation_casual` (hat) | Beach at golden hour, straw hat, knit cardigan, surf behind |

   Same face, same swatch. The style hint carries location, wardrobe,
   lighting, season and pose.

So each concept ships a **self-made** neutral swatch (`public/concept-neutral.jpg`)
purely to satisfy the required field, and the concept identity lives entirely
in the style hint. No third-party imagery is involved, which keeps the feature
clear of the licensing problem in §7.

Generative calls are also the slowest on the platform: 11–16s versus 4–9s for
compositing calls.

Three of the eight concepts have been generated and inspected; the rest are
marked `verified: false` in the registry and labelled as such in the UI.

---

## 2. Which endpoints tolerate which images

The published dimension tables are not the whole story. Face *size* limits
differ enormously between endpoints, and this is the most common cause of a
failure that still costs units.

| Feature | Documented requirement | Observed |
|---|---|---|
| Hair style v2.1 | face width ≥ 128px, shoulders visible | 355×436 portrait passes comfortably |
| Clothes v4 | long side ≤ 1024 | 355×436 passes; composites cleanly |
| Makeup look (`look-vto`) | long side ≤ 1024 | 355×436 passes |
| Earrings (2D VTO) | long side ≤ 1024 | 355×436 passes |
| **Makeup Transfer** | "1024×1024, single face, full face" | **355×436 REJECTED** with `error_src_face_too_small`; 834×1024 accepted |

`mu-transfer` is by far the strictest endpoint. It validates **both** the
source and the reference, with a separate error code for each side:

```
error_src_face_too_small / error_ref_face_too_small
error_src_no_face        / error_ref_no_face
error_src_large_face_angle / error_ref_large_face_angle
error_src_eye_closed     / error_ref_eye_closed
error_src_eye_occluded   / error_ref_eye_occluded
error_src_lip_occluded   / error_ref_lip_occluded
error_inappropriate_ref_case01   hair too close to the eye, or too little
error_inappropriate_ref_case02   skin beside the eyetail, in the reference
```

None of these appear in the shared `EngineErrorCode` enum in the OpenAPI
bundle. They are per-feature and only listed in prose.

### The product risk this creates

Makeup Transfer is the natural answer to the problem in CONTEXT §2 — the bride
and the MUA working from Pinterest screenshots of other people's faces. But a
Pinterest save is frequently a small, cropped, three-quarter-angle, or
hair-across-the-face image, and this endpoint rejects exactly those.

An upscaled 172×211 thumbnail was rejected with `error_inappropriate_ref_case01`
even after the source passed.

**Design consequence:** never present Makeup Transfer as "paste any inspiration
photo". Validate the reference before spending, explain the specific rejection
in plain language, and always offer the 349-look `look-vto` catalogue as the
fallback path. A silent failure here costs units and trust at the same time.

---

## 2b. cloth-v4 reads a garment reference literally, including what it omits

Measured 31 Aug 2026 across all eight garments in the Nusantara library.

A flat-lay reference photographed with the front **open** — the natural way to
lay out a kebaya so the lace is visible — is not interpreted as "a kebaya". It
is interpreted as *this exact garment, open*. The result composited onto the
bride was an open jacket over a bare midriff: not how the outfit is worn, and
unusable in a bridal product.

The same failure hit the Minangkabau outfit, whose prompt described "a loose
tunic" without saying the front was closed.

**The fix is in the reference prompt, not the API call.** Every garment prompt
now states the front is closed, over an opaque inner layer where the tradition
has one, with the torso covered. `docs/IMAGE-PROMPTS.md` carries the wording.

### What is verified

All eight garments composite correctly onto the bride's real photo, preserving
her face, background, pose and crop:

| Reference | Result |
|---|---|
| Kebaya Jawa klasik | lace kebaya over cream inner layer, batik parang wrap skirt |
| Kebaya Sunda | closed white lace over inner layer, gold batik skirt |
| Baju kurung Minang | solid red tunic, gold songket cuffs and skirt |
| Payas agung Bali | wrapped gold brocade bodice, songket kamen |
| Baju bodo Bugis | square-cut crimson blouse, striped sarong |
| Ulos Batak | navy-gold brocade blouse, ulos-striped skirt |
| **Kebaya hijab modern** | hijab covering hair and chest, ivory lace, long skirt |
| **Gaun syar'i Aceh** | long hijab, maroon gown, gold embroidery, full coverage |

The last two matter most: **the hijab path works through `clothes`**, which is
what §1 predicted after the `scarf` endpoint turned out to be a scene
generator. Muslim bridal looks are reachable, just not through the endpoint
whose name suggests it.

### Bride photo angles, verified

`face-right.jpg` and `face-left.jpg` were checked for the anatomical swap that
would corrupt the three-photo diagnostics. They are correct as named: a subject
turning to their own left presents their **right** side to the camera and their
nose points to frame-right, which is what `face-right.jpg` shows.

Confirmed functionally — hair type detection accepted the set in front, right,
left order and returned `2A to 2B, Slight to Medium Wavy` in 7.5s.

---

## 2c. Every remaining feature, and what each one refuses

Measured 31 Aug 2026. All now working; each needed a photo the earlier set did
not contain, which is the pattern worth remembering — **these endpoints fail on
the subject, not the format.**

| Feature | First failure | Fix |
|---|---|---|
| Ring | `Hand pose should be correct` | One hand, upright, back to camera, wrist in frame |
| Bracelet | `Wrist size should fit in range`, then `Wrist should be in the correct pose` | Arm **vertical**, wrist facing the camera rather than edge-on |
| Nail | `error_nail_too_small` | Macro crop where the nails dominate the frame |
| Teeth whitening | `error_no_teeth` | An **open smile**. The default bride photo has a closed mouth |
| Custom makeup | `400 InvalidParameters` | `lip_color` also requires `morphology` and `style`, not just `palettes` |

Earrings, necklace and eye colour lens worked first time.

Only the makeup failure was free: it was rejected at creation (HTTP 400). The
other four were engine content errors on an accepted task, so they were billed.
Four photos and one payload shape cost about 5 units to discover.

### Verified payload shapes

```
teethWhitening  { effect: { whitening_intensity: 0-100 }, index: 0 }
eyeColor        { effect: { intensity: 1-100, enlargement: 0-100 } } + lens reference
nailColor       { effect_type: "nail_polish",
                  effects: [ { sub_type, finger, color, texture,
                               transparency, reflection, contrast, roughness } x5 ] }
makeupCustom    { effects: [ { category: "lip_color", shape, morphology, style, palettes },
                             { category: "blush", pattern, palettes } ] }
```

---

## 2d. Two bugs that only appear in production

**A live call on Vercel returned a broken image.** The runtime filesystem is
read-only, so `writeFixture` could not mirror the result, but the route still
advertised the local `/fixtures/<key>.jpg` path — a file that was never
written. Every live call in production rendered a broken image while reporting
success. The response now falls back to the upstream URL when the mirror fails.

**A multi-file picker returns files in the browser's order, not yours.** The
three-photo diagnostics require front, right, left. A file dialog sorts
alphabetically, so `face-left` arrived before `face-right` and the API answered
`error_face_angle_invalid` — after charging. The UI now has one labelled slot
per photo, and slot order is wire order.

Neither reproduces locally: the first needs a read-only filesystem, the second
needs a real file dialog.

---

## 2e. Do not re-encode a photo that already meets the spec

The upload helper pushed every file through a canvas, even when it was already
jpg and within 1024px. Same visible image, different bytes — and the fixture
cache is keyed on a hash of those bytes, so **every upload through the UI missed
the cache and made a billable call**, including for looks already cached.

A conforming file now passes through untouched. The same photo that built the
kebaya fixture replays in 11ms for 0 units.

---

## 2f. Perfect Corp ships no jewellery catalogue, and placement is on you

Verified by enumerating every path in the five 2D VTO bundles:

| Feature family | Catalogue endpoint |
|---|---|
| Hair style, look, cloth, fabric, bangs, beard… | `GET /s2s/…/task/template/<name>` |
| **Earring, necklace, ring, bracelet, watch** | **none — not one** |

The 2D VTO suite is built for retailers bringing their own SKU photos, so the
jewellery in this project is generated rather than fetched. There is nothing to
fetch. (Their docs do embed a handful of illustrative product images, but §7
forbids redistributing them.)

### The product photo format is not free-form

A bangle photographed **face-on and flat** composited as a sticker: a straight
band laid over the forearm, overhanging the arm silhouette on both sides, with
no wrap and no occlusion.

The engine needs a **closed ring shot at a three-quarter angle from above, with
the inner opening visible**. That is what their own `bracelet_anchor_point`
diagram shows, and it is the only way the engine can infer the ring's plane.

### `object_infos[].parameter` is where placement lives

Never sent it at first, so the engine guessed. The keys are per-feature:

```
bracelet_anchor_point       [[x1,y1],[x2,y2]] on the product's INNER edge
bracelet_wearing_location   -0.3 … 1.0, 0 = at the wrist joint
bracelet_shadow_intensity   0 … 1
earring_anchor_point, earring_wearing_location, earring_scale,
earring_is_right_ear, ring_anchor_point, …
```

### "The 2 farthest points" means the farthest *pair*

This cost two attempts. The inner opening of an angled bangle is a tilted
ellipse, so its horizontal extremes and its farthest-apart pair are different
points — 281px apart versus 506px. Using the horizontal extremes scaled the
bangle about twice too large.

`scripts/measure-anchor.py` measures it properly: flood the background from the
border, take the largest enclosed region as the opening (filigree openwork
creates hundreds of small ones), then the farthest pair on its convex hull.

With the right product format and measured anchor points, the bangle sits at
the wrist joint, wraps in perspective, and the arm correctly occludes its far
side. The values live on the reference entry in `src/lib/references.ts`, so
picking it from the library sends them automatically.

Earrings, necklace and ring were acceptable on engine defaults; only the
bracelet needed this.

---

## 2g. The hair diagnostic answers about the *photo*, not the person

Two runs of `hairTypeDetection` on the same synthetic bride, same right/left
photos, differing only in the front shot:

| Front photo | Result |
|---|---|
| `face-front-hairdown.jpg` — hair loose | **2A to 2B**, Slight to Medium Wavy |
| `face-front.jpg` — hair in a tight bun | **1 to 2A**, Straight to Slight Wavy |

Hair scraped back leaves almost no texture to read, so the engine reports
straighter hair than the person has. Not a bug — a correct reading of the
wrong photo.

**This matters for Hair Readiness.** A verdict on whether her hair can reach a
target style by the wedding is worthless if the answer moves a whole band
depending on how she happened to wear her hair that morning. The UI has to
insist on loose hair in all three shots, and the readiness copy should say what
the diagnostic was based on.

Diagnosed at **zero cost** by recomputing the fixture key for every three-photo
combination in `input/` until one matched the key in the Vercel logs — worth
remembering as a technique, since it identifies exactly what a user uploaded
without another API call.

### The cache key ignored photo order

`fixtureKey` sorts the image hashes, which is right when photos are
interchangeable and wrong here: the API reads them as front, right, left and
answers differently when swapped, so both orders collided on one entry. A
swapped run would have silently replayed the correct-order result.

Order is now folded into the identity for multi-photo features only, leaving
every other fixture key untouched. Verified: correct order replays for 0 units;
swapped order no longer hits that entry and is rejected by the API, as it
should be.

---

## 3. A failed AI task still costs units

From the endpoint descriptions, verbatim:

> "If the task is not polled in time, the task may expire; a later status check
> can return `InvalidTaskId` even if processing finished, and the consumed
> units may still be charged."

Observed to extend to content rejections too: a task that is accepted (HTTP
200 with a `task_id`) and then fails with an engine error has already been
created, and should be assumed billed. Only failures rejected at *creation*
time (HTTP 400, e.g. `InvalidTemplate`) are certainly free.

This is why `buildPayload` validates the whole option set **before** any upload
or task creation, and why the fixture cache is consulted before anything else.

---

## 4. Versions

Every API was audited by enumerating POST operations in the raw OpenAPI
bundles (`docs.perfectcorp.com/_bundle/reference/<api>.json`) and reading the
`tags` on each. **Only two features ship more than one version:**

| Feature | Versions | Pinned to |
|---|---|---|
| Hair Style | v1.0 `hair-style`, v2.0 `hair-transfer`, V2.1 `hair-transfer` | **v2.1** |
| Clothes | V2.0 `cloth`, V3.0 `cloth-v3`, V4.0 `cloth-v4` | **V4.0** |

All 27 others are single-version. "Use the latest" is a settled question
everywhere else.

### The clothes trap

**`cloth-v4` dropped `template_id` entirely.** The 250-outfit catalogue only
works against the older V2.0 `cloth` endpoint. Upgrading naively to V4 silently
removes the whole catalogue.

Both are registered: `clothes` (V4, custom reference, newest engine) and
`clothesTemplates` (V2.0, catalogue). Neither replaces the other.

---

## 5. Measured latency

The documentation states no processing time anywhere. It refers to a
`polling_interval` field that does not exist in any response schema.

| Feature | Poll time | Polls at 1.5s |
|---|---|---|
| Hair colour | 4.2s | 3 |
| Hair length detection | 5.8s | 4 |
| Makeup full look | ~6s | 4 |
| Hair style v2.1 | 7.4s | 5 |
| Clothes, catalogue gown | 7.6s | 5 |
| Clothes v4, custom reference | 9.3s | 6 |
| **Scarf (generative)** | **12.8s** | 9 |

The generative family is roughly twice as slow as the compositing ones, which
is consistent with it synthesising a whole image rather than editing one.

Budget 5–13 seconds per call. Design the UI for it rather than retrofitting
spinners later.

---

## 6. Catalogue coverage is thin, Western, and thinner still for bridal

Full pagination of both catalogues, at zero units:

**`look-vto` — 349 looks across 25 categories**

| Bridal-usable | Count |
|---|---|
| Wedding | **3** (`all_sugar_kiss`, `all_ethereal`, `all_classic`) |
| Makeup Artist | 27 |
| Red Carpet | 4 |

The other 315 are Sports (57), Halloween (22), Animals, K-Pop and similar.

**`cloth` — 250 outfits across 14 categories**

| Bridal-usable | Count |
|---|---|
| Wedding | **4** |
| Cultural Attire | 16 — Hakama, Red Kimono, Bindalli, Hanbok, Saree, Qipao, Dirndl, Lederhosen, Thai Heritage |

**There is no kebaya. No hijab. No songket, batik or tenun. Nothing
Indonesian at all**, in either catalogue.

Template ids are not titles — the Wedding look "Ethereal" is `all_ethereal`,
and passing the title returns `InvalidTemplate`.

### Why this is an argument, not a complaint

Every competitor on this track gets the same 3 wedding looks and 4 wedding
gowns. The differentiator is not the catalogue; it is the custom reference
path, which is verified working for both garments (§2) and makeup.

Indonesia is not one bridal aesthetic. Paes Ageng in Yogyakarta, Sundanese
siger, Minang suntiang, Balinese payas agung, Bugis, Batak — different
silhouettes, different headpieces, different makeup entirely. A curated
regional reference library is the localisation that no template catalogue on
this platform can serve. See `references/README.md`.

---

## 7. Licensing: Perfect Corp's sample and template images may not be shipped

Checked against the API Terms of Service.

- **§11.1** — "Perfect and its licensors own all rights, title and interest,
  including all worldwide intellectual property rights in the Service, Perfect
  Content... You agree not to engage in the use, copying, distribution or
  modification of any of the Perfect Content other than as expressly permitted
  herein."
- **§8.1** — "you have no right to disseminate, transfer, license, or provide
  these resources to others for use."
- **§8.6(r)** — prohibits using "automated devices, manual processes, or
  scripts to copy or 'scrape' Perfect Content for any purpose without Perfect's
  express written permission."

There is no clause granting demo or evaluation rights over sample imagery.

### What this permits and forbids

| Action | Verdict |
|---|---|
| Rendering `thumb` URLs live from their CDN in the template picker | **Fine** — that is what the template API is for |
| Downloading their sample or template images and committing them to this repo | **Not permitted** without written permission |
| Shipping their sample photos as the app's demo content | **Not permitted** |
| Caching results generated from a photo *you own* | Fine, and what the fixture cache does |

### Consequence for this repo

The fixtures currently committed were generated using a Perfect Corp template
thumbnail as the source photo, because the sample selfie URL in the docs
returns 404. **They are fine as throwaway engineering fixtures and must not
ship in the submission.** Regenerate them from a photo you own or have
licensed before the repo is published or the demo is filmed.

If you want their samples specifically, the contact for written permission is
`YouCamOnlineEditor_API@perfectcorp.com`. For a hackathon deadline, using your
own photos or properly licensed stock is faster and carries no risk.

---

## 8. Chaining try-ons produces one real photo, and it self-caches

Measured 1 Sep 2026.

Every feature until now ran once against the bride's photo and showed the
result on its own, which leaves her with five separate pictures and no single
image of the look she chose. Feeding each result into the next step's input
fixes that: five real try-ons against the real frame, ending in one genuine
photograph. Verified — kebaya, sanggul, makeup, necklace and earrings all
present in one 747x1024 image, her face, background and crop untouched.

Three things had to be true, and only one of them was obvious.

### 8a. No existing photo could carry the whole chain

| Photo | Face width | Verdict |
|---|---|---|
| `full-body.jpg` | ~75px | **Under the documented 128px minimum.** Makeup, hair and jewellery all unreachable |
| `face-front.jpg` | ~370px | No torso for cloth-v4 to dress |
| **`half-body.jpg`** (new) | ~180px | Both. Waist-up is the only framing that satisfies each end |

This is why `input/half-body.jpg` exists. It is generated by
`scripts/generate-assets.py half-body`, conditioned on `face-front.jpg` like
every other bride shot, so the identity carries across.

### 8b. Step order is structural, not cosmetic

Each pass repaints a region and overwrites whatever is already there, so the
rule is largest affected area first:

```
garment (torso) -> hair (crown, shoulders) -> makeup (face)
  -> necklace (collarbone) -> earrings (ears)
```

A necklace applied before the kebaya simply disappears under it.

**But ordering alone does not save the earrings.** The first full run used
`female_s_wave_brunette`, composited four layers beautifully, and then died on
the last step:

```
earlobe alignment not confident.
```

The loose waves had covered both ears. No step order fixes that — you cannot
photograph an earring the hair is covering, and moving earrings earlier just
means the hair paints over them. **The fix is an updo**, which is what a bridal
sanggul is anyway. `female_casual_updo` exposes the ears and the chain
completes.

That failure was an engine error on an accepted task, so it was billed. Cost of
learning it: 1 unit, plus 7 for the four layers that did land.

Two related notes from the same run:

- `hair_color: "src"` matters. Without it the template drags its own colour
  along and a brunette source came back strawberry blonde. It only works on
  templates whose `keep_users_color` is true — `female_casual_updo` is one,
  `female_bangs_updo` is not. Read the flag, do not assume.
- Of 116 hair-transfer templates, only about a dozen are updos, and they are
  listed as Messy Bun, Casual Updo, High Pony Tail and similar. There is no
  "sanggul", no bridal category at all — the same Western-catalogue gap as
  section 6.

### 8c. The chain costs units once, then replays free

A chain is **not** covered by the single-step fixtures. Step 2 reads step 1's
output, which is a different image with a different byte hash, so it is a fresh
cache key and a real billable call the first time.

It self-caches from then on, and no chain-level cache machinery was needed. Two
existing properties make that work:

1. Compositing calls return the same dimensions they were given — 747x1024 at
   every step of a five-step chain.
2. `prepare-image.ts` passes a conforming jpg through untouched (section 2e).

So a replay feeds byte-identical inputs to every step and hits all five
fixtures. Verified with `PERFECTCORP_OFFLINE=1`, which forbids live calls
outright:

```
Kebaya   fixture 0u 4ms      Kalung  fixture 0u  7ms
Sanggul  fixture 0u 4ms      Anting  fixture 0u 47ms
Makeup   fixture 0u 4ms      TOTAL   0 units, 8 saved, 85ms
```

The whole look, free, in 85ms, on the read-only Vercel filesystem.

The demo photos therefore ship in `public/demo/` rather than the git-ignored
`input/`: the browser has to upload byte-identical bytes or every step misses.

### 8d. The hand shots can never join the chain

Ring, bracelet and nails are macro crops of one hand. No try-on composites one
photograph into another, so they cannot be merged into a waist-up portrait at
any step order. They sit beside the finished look as detail tiles instead.
Their existing fixtures replay unchanged.

---

## 9. The video API: two engines, and the cheap one is not the documented one

Verified 1 Sep 2026 against
`docs.perfectcorp.com/_bundle/reference/ai_video_generator.json`. The slug is
`ai_video_generator` with underscores — the hyphenated forms every other bundle
uses all 404 here.

None of this family was in the 29-API audit of section 4, so "only two features
ship more than one version" does not cover it. **Image to Video ships two, and
they are not the same deal at all.**

| | Endpoint | Driven by | Cost |
|---|---|---|---|
| V1.0 | `POST /s2s/v2.0/task/image-to-video` | `template_id` (catalogue) | **3 units/sec** std, 6 pro |
| **V2.0** | `POST /s2s/v2.0/task/image-to-video/youcam` | free-form `prompt` | **1/2/3 units/sec** at 480/720/1080 |

So the shortest possible V1 clip is 15 units and the shortest V2 clip is 5 — a
3x difference for the same 5 seconds. Both are POSTed under the `/v2.0/` path
prefix regardless of which version they are; the version lives in the tag, not
the URL.

Full unit table, from the spec's own text:

| Resolution | Per second | 5s | 10s |
|---|---|---|---|
| 480p | 1 | **5** | 10 |
| 720p | 2 | 10 | 20 |
| 1080p | 3 | 15 | 30 |

Video is the only feature on the platform that does not bill a flat rate, which
is why `FEATURES.imageToVideo.units` is only the 480p/5s figure and
`videoUnits()` computes the real one.

### The V1 catalogue is not usable for bridal

Listed free, in full: the categories are **Animal, Portrait, Transform and
Dance** — Puppy Love, Purrfect Duo, Jump for Joy, Superhero, Wildfire, Slow
Waltz. Nothing bridal, nothing neutral. Paying 3x more to pick the least wrong
novelty template is the worse deal twice over, so only V2 is registered.

(`page_size=50` on the template listing returns HTTP 400. The cap is 20, as
everywhere else.)

### Measured: 61.6 seconds for a 5-second clip

| | |
|---|---|
| Poll time | **61.6s over 36 polls** |
| Output | 480x656, 16fps, 81 frames, 5.06s, 1.68 MB mp4 |
| Units | 5 |

That is roughly **5x the slowest compositing call on the platform** (the 12.8s
generative scarf) and 10x a typical try-on. Two consequences:

- The default 90s poll timeout is too close for comfort, and would certainly
  fail at 1080p/10s. `imageToVideo` carries `pollTimeoutMs: 300_000`.
- 61s fits inside the route's `maxDuration` of 120 but leaves little headroom.
  Generate video **locally** to bank the fixture, exactly as with every other
  feature; production replays it in milliseconds.

Output resolution behaved exactly as documented: the input's short side (747)
was resized down to the selected 480, giving 480x656. Input must be jpg/png
under 10MB with a long side under 4096 and an aspect ratio between 1:2.5 and
2.5:1 — every fixture in this project is 747x1024 (0.73), comfortably inside.

### What the prompt does and does not control

The clip holds identity, sanggul, kebaya lace, necklace and earrings, and takes
her from a neutral expression to a warm smile. It is good. But measured against
what was actually asked for:

- **"The camera holds still" was ignored**, and so was `camera zoom` in the
  negative prompt. The clip pushes in noticeably over 5 seconds. Negative
  prompts do not appear to constrain camera motion.
- **Jewellery detail drifts.** The filigree drop earrings are reinterpreted as
  teardrops by the last frame. The video model re-synthesises the image rather
  than preserving it pixel-exact, so fine product detail is approximate.

Neither is a defect for a mood clip, but it does mean the video must never be
presented as a record of the specific product she picked. The still is the
artefact; the video is the feeling.

### 9a. Full-body video works, and it is the better clip for judging a garment

Measured 1 Sep 2026, second video run: `full-body.jpg` + kebaya jawa klasik
(an existing fixture, so the still cost 0) animated at 480p/5s for 5 units.
51.9s over 31 polls — consistent with the 61.6s half-body run.

**The garment survives well.** The lace pattern on the kebaya, the batik parang
motif on the kain, the hem length and the silhouette are all still readable and
consistent from the first frame to the last. For a bride deciding whether a
kebaya suits her, seeing the fabric move is worth more than seeing it still, and
this is the only way to get it.

**The face does not survive as well.** At full-body framing the head is roughly
75px in the source and about 65px after the 480p downscale, so the model
re-synthesises it rather than preserving it. It stays a plausible, similar
woman — centre-parted bun, same colouring — but by the last frame the jaw is
rounder and the features have softened. It is not grotesque; it is simply no
longer reliably *her*.

So the two framings are not competing, they are for different questions:

| Source | What the clip is for | What it cannot do |
|---|---|---|
| `half-body` composite | The beauty look — makeup, sanggul, perhiasan, on her face | Show the skirt, hem or silhouette |
| `full-body` + garment | The outfit — drape, movement, hem, silhouette | Carry makeup, hair or jewellery; hold facial identity |

The second row's exclusions are not a video limitation, they are section 8a
again: a ~75px face is under the 128px minimum, so makeup, hair and jewellery
can never be composited onto a full-body frame in the first place. The outfit
is all there is to animate, which is exactly why the clip should be sold as the
outfit rather than as her.

**The camera push-in is now confirmed three times.** The second run asked for
"Full body stays in frame" in the prompt and listed both `cropping the body`
and `camera zoom` as negative prompts. It pushed in anyway, and the last frame
had nearly cropped her shoes. That matters more here than on the half-body
clip: hem length and footwear are part of what a bridal outfit decision turns
on, and the end of the clip loses them.

### 9b. Asking for less motion produced more of it — and two stills cannot tell you

Measured 1 Sep 2026, third video run, on the same still.

The hypothesis was that a calmer prompt would tame the camera push-in. On
framing alone it appeared to work:

| Prompt | Feet at the last frame |
|---|---|
| "turns slowly from side to side… **full body stays in frame**" | nearly cropped |
| "**stands still and breathes gently**… minimal motion" | still in frame |

That was reviewed by comparing the first and last frame, the recipe was switched
to the calmer prompt — and on watching it, the clip was obviously worse. It was
reverted.

**The numbers say why.** Mean absolute frame-to-frame change, on downscaled
greyscale:

| Clip | Mean | Peak |
|---|---|---|
| "turns slowly" | **4.84** | 7.05 |
| "stands still, minimal motion" | **9.98** | 16.31 |

The clip that asked for *minimal motion* carries **twice the pixel churn**.
Asking for less movement did not get less movement — it got the model inventing
motion and warping the subject to fill five seconds. A body genuinely turning
moves coherently; a body told to hold still gets animated anyway, incoherently.

### The methodological lesson, which is the more useful one

**Two still frames cannot show motion quality.** Framing, identity drift and
cropping are all visible in a first-and-last comparison; smoothness, warping and
uncanniness are not, and they are what makes a clip unusable. Reviewing a video
by its endpoints measures the one axis that is easiest to see and misses the one
that matters.

Frame-to-frame difference is cheap, needs no model, and would have caught this
before the recipe was changed. Use it, or watch the clip. Preferably both.

The camera push-in itself remains unsolved after three runs, with `camera zoom`
negated every time. **Negative prompts do not appear to constrain camera motion
at all**, and the still remains the record of the hem.

### Latency varies more than the first measurement suggested

Three 480p/5s renders: **61.6s, 51.9s, ~38s**. Budget the top of that range
rather than the average — and note that with create-and-poll split across
requests (section 9c) the figure stops mattering for the function limit and only
affects how long she waits.

### 9c. Video cannot be created and polled in one request

At 61.6s worst case against a serverless function budget that may be 60, the
blocking route was one second of variance from failing in production — on the
feature that closes the demo.

`POST /api/video` creates and returns; `GET /api/video/<taskId>` reads the
outcome later. Measured: **create returns in 2s**, polling reports `running`
three times, success at ~38s.

This needs somewhere to keep the task's identity between two requests, because
serverless invocations share no memory. The cache key and the real unit cost are
computed at creation and parked server-side — never handed to the client, since
video does not bill a flat rate and a caller that could name its own key could
file a result over someone else's cache entry.

One trap: **Postgres `jsonb` normalises key order**, so a parked `inputs` object
returns with its keys rearranged. Same keys, same values, different
serialisation. Harmless here only because the key is stored rather than
recomputed from it.

---

## 10. Hair Density rejects every photo, and its own error message says it should not

Measured 2 Sep 2026. Three attempts, three units, no result.

| Photo sent | Angle | Result |
|---|---|---|
| `face-front-hairdown.jpg` | frontal | `error_face_angle_invalid` |
| `face-front.jpg` (prompted "perfectly upright and square, no tilt, no turn") | frontal | `error_face_angle_invalid` |
| `face-right.jpg` | ~45° three-quarter | `error_face_angle_invalid` |

The message is:

> The face angle is not within the supported range. For front-facing photos,
> keep the head within 10°; for side-facing photos, use more than 15°.

Both of those conditions are satisfied by the photos above, on opposite sides
of the range, and both were rejected. Whatever the endpoint is actually
measuring, it is not what the message describes — and the same photos are
accepted by `hairTypeDetection`, `hairLengthDetection` and
`hairFrizzinessDetection`, all of which returned results on this set.

**Every failure was billed.** They are engine errors on accepted tasks, which is
the pattern in section 3: only a creation-time rejection is free.

### Consequence

Hair Readiness runs on the three diagnostics that work — length, type and
frizziness. Density would have contributed a "needs volume" signal and nothing
that the other three cannot cover. `src/lib/readiness.ts` states its absence
rather than silently omitting it.

**Do not retry this without a genuinely different photo source.** Three attempts
across the full angle range is enough evidence to stop paying for the fourth.

---

## 11. The diagnostic enums are in the OpenAPI bundles, and they are worth reading first

All four diagnostics publish their complete result vocabulary, which the
responses themselves only ever reveal one value at a time. Reading them cost
nothing and prevented inventing a scale:

| Feature | Bundle slug | Bands |
|---|---|---|
| Hair type | `ai_hair_type_detection` | 9, `1 to 2a` … `4b to 4c` |
| Hair length | `ai_hair_length_detection` | 8, `above the ears` … `long hair` |
| Hair density | `ai_hair_density_detection` | 4, `Extremely Low` … `High Density` |
| Frizziness | `ai_hair_frizziness_detection` | 4, mapping 0-3, `Not Frizzy` … `Extreme Frizzy` |

Note the slugs use underscores, like `ai_video_generator` in section 9 and
unlike most other bundles.

### One mismatch that would break a naive comparison

**The spec says `2a to 2b`; the API returns `2A to 2B`.** Case differs between
the documented enum and the live response, so any lookup against the band list
has to fold case. `typeIndex()` does.

The length ladder is ordered but not numeric — the endpoint returns a phrase,
never a measurement — so turning "how long is her hair" into "how many months of
growth" needs an estimated centimetre value per band. Those estimates are ours,
are marked as ours in `readiness.ts`, and are why every figure the UI shows is
phrased as an approximation.
