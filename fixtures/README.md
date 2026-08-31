# Fixture cache

Every successful Perfect Corp task is memoised here as JSON, with the result
image mirrored to `public/fixtures/<key>.jpg`. The image is downloaded rather
than linked because the upstream result URL expires after 2 hours.

- Read on every request, so a repeat call costs 0 units instead of 1–2.
- Written only on a writable filesystem. Vercel's runtime is read-only, so the
  deployed app replays these and never writes new ones — which is exactly what
  you want on demo day.
- `PERFECTCORP_LIVE=1` forces a live call past the cache.
- `PERFECTCORP_OFFLINE=1` forbids live calls entirely. Zero units, guaranteed.

## Provenance warning — read before publishing

The fixtures committed during the 30–31 August engineering sessions were
generated using **a Perfect Corp template thumbnail as the source photo**,
because the sample selfie URL in their own docs returns 404.

Perfect Corp's API terms reserve all rights in their content and forbid
copying or redistributing it (§11.1, §8.1, §8.6(r); see `docs/FINDINGS.md` §7).

**These fixtures are throwaway engineering artefacts. Do not ship them.**
Before the repo is published, the demo is filmed, or the project page goes up,
delete them and regenerate from a photo you own or have licensed:

```bash
rm -f fixtures/*.json public/fixtures/*.jpg
```

Then re-run each look once through `/test` with your own photo. Budget roughly
2 units per try-on.

**Photo spec and the full regeneration steps: `docs/ASSETS.md`.**
