# Nusantara reference library

> Shooting spec, the full slot table and where files go: **`docs/ASSETS.md`**.

Perfect Corp's catalogues contain no kebaya, no hijab, and nothing Indonesian
at all — 3 wedding makeup looks and 4 wedding gowns, every one of them Western
(see `docs/FINDINGS.md` §6). This folder is the localisation that replaces
them.

**No images ship with this repo.** Every entry in `src/lib/references.ts` is a
declared slot with nothing behind it. `/api/references` hides any slot that is
missing an image, a credit or a licence, so an incomplete entry can never reach
the UI.

## Adding one

1. Drop the photo at `public/references/<id>.jpg`, matching an `id` in
   `src/lib/references.ts`.
2. Fill in `credit` and `license` for that entry. Both are required by the
   type — a slot with an image but no attribution stays hidden.
3. Restart `next dev`. It appears in the picker.

## Image requirements

Different endpoints have very different tolerances. Getting this wrong costs
units, because a task that the engine rejects on content has already been
created and billed.

### Garments — `use: "clothes"` → cloth-v4

- jpg, long side ≤ 1024px, under 10 MB
- The garment should be clearly visible: flat-lay or on a model, full body
- Verified working: a wedding gown reference composited cleanly onto a
  head-and-shoulders portrait, preserving face, background and crop

**Hijab looks go here, not through the `scarf` feature.** Scarf generates an
entirely new scene rather than dressing the uploaded photo — it returned a
woman in a red coat on an autumn street. See `docs/FINDINGS.md` §1.

### Regional makeup — `use: "makeupTransfer"` → mu-transfer

This is the strictest endpoint on the platform and it validates the reference
as carefully as the source:

- **High resolution.** Face must fill most of a 1024px frame. A 355×436
  portrait was rejected outright with `error_src_face_too_small`.
- **Frontal.** Angled faces fail with `error_ref_large_face_angle`.
- **Eyes open and unobstructed**, lips unobstructed.
- **Hair well clear of the eye area.** An upscaled thumbnail failed with
  `error_inappropriate_ref_case01`: hair too close to the eye, or too little
  skin beside the eyetail.

Paes ageng and suntiang both involve elaborate headpieces close to the
hairline, so shoot or select these deliberately — a beautiful reference that
the API refuses is worth nothing.

## Licensing

Do not use Perfect Corp's sample or template images here. Their API terms
(§11.1, §8.1, §8.6(r)) reserve all rights in "Perfect Content" and forbid
copying or redistributing it without written permission. Rendering their
template thumbnails live from their CDN in a picker is fine; committing those
files to this repo is not.

Use photographs you own, ones licensed for the purpose, or ones a MUA has
given you written permission to use. Record which, in the `license` field.
