# Fixture cache

Every successful Perfect Corp task is memoised here as JSON, with the result
mirrored to `public/fixtures/<key>.jpg` — or `.mp4` for the video feature, which
is what `mediaType` on the fixture distinguishes. The result is downloaded
rather than linked because the upstream URL expires after 2 hours.

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

## Chain fixtures

Six of these belong to the composite look at `/look`, where each step's output
is the next step's input. They are keyed on the bytes of the previous stage, so
they only replay in sequence and only from `public/demo/half-body.jpg` — an
upload of a re-encoded copy misses all six and bills the chain live.

Three more are a dead branch, kept because they were paid for: the first run
used the hair-down template `female_s_wave_brunette`, which composited fine and
then made the earrings impossible because the waves covered both ears. The
recipe now uses an updo. See `docs/FINDINGS.md` §8b.

## Superseded, but kept

`9233763a…mp4` is the first outfit clip, generated with a prompt that asked her
to turn from side to side. It pushed in hard enough to nearly crop her shoes, so
the recipe now uses a calmer prompt and `e5f37b09…mp4` instead. Kept because it
was paid for and because FINDINGS §9b cites the comparison.
