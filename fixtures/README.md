# Fixture cache

Every successful Perfect Corp task is memoised here as JSON, with the result
image mirrored to `public/fixtures/<key>.jpg`. The image is downloaded rather
than linked because the upstream result URL expires after 2 hours.

- Read on every request, so a repeat call costs 0 units instead of 1–2.
- Written only on a writable filesystem. Vercel's runtime is read-only, so the
  deployed app replays these and never writes new ones — which is exactly what
  you want on demo day. A cache **miss** in production still makes a real,
  billable call, so keep the demo on paths that already have fixtures.
- `PERFECTCORP_LIVE=1` forces a live call past the cache.
- `PERFECTCORP_OFFLINE=1` forbids live calls entirely. Zero units, guaranteed.

## Provenance

**Resolved 31 Aug 2026.** The earlier fixtures were generated using a Perfect
Corp template thumbnail as the source photo, because the sample selfie URL in
their own docs returns 404. Their terms reserve all rights in that content
(`docs/FINDINGS.md` §7), so those have been deleted.

Everything here now derives from the **synthetic bride** in `input/`, generated
with Gemini via `scripts/generate-assets.py`. No third-party imagery is
involved, nobody's consent is outstanding, and the repo is safe to make public.

## Regenerating

Only generate what the demo video actually shows — roughly 2 units per look.

```bash
npm run dev                     # then walk each look at /test
```

Use `input/face-front.jpg` for makeup, hair and jewellery, and
`input/full-body.jpg` for outfits. Full spec: `docs/ASSETS.md`.
