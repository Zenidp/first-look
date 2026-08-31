# CONTEXT.md — First Look

> Session continuity file. Read this fully before doing anything.
> Update the Progress Log at the bottom at the end of every session.

---

## 1. What we are building

**First Look** is a bridal look studio for Indonesian makeup artists (juru rias) and their clients.

A bride and her MUA settle on the complete wedding look before the paid trial session happens. The app builds a shareable look board that combines makeup, hair, and jewellery on the bride's actual face, then tells her whether her current hair can realistically reach the target style by the wedding date.

The name has two meanings. "First look" is the wedding-industry term for the moment before the ceremony. Here it also means seeing the look before committing money to it.

**One-line pitch:** See your wedding look before you pay for the trial.

---

## 2. Why this problem

- A bridal trial makeup session in Jakarta costs real money and half a day, and frequently ends in a look the bride does not want.
- The bride and the MUA are working from Pinterest screenshots of other people's faces. There is no shared reference on the bride's own face until the trial.
- Bridal hairstyle failures are usually a hair *condition* problem (length, volume, damage, texture) rather than a stylist skill problem, and nobody checks that months ahead when it could still be fixed.

**Who pays:** the MUA, not the bride. This is a B2B2C tool for a service professional. MUAs and bridal sanggar already pay for tools and have clear revenue per client.

---

## 3. Hackathon constraints (non-negotiable)

- **Event:** DevNetwork [API + Cloud + AI] Hackathon 2026 (Devpost), Perfect Corp sponsor track.
- **Deadline:** Thursday 3 September 2026, 10:00 AM PDT. That is Friday 4 September 00:00 WIB. No late submissions.
- **Participation:** remote from Jakarta. Overall Winner requires onsite attendance, so we are NOT competing for it. Perfect Corp track only.
- **Team:** solo.
- **Must be built from scratch.** No reuse of SkinMatch AI code, assets, or components. New repo, new everything.

### Perfect Corp track requirements
- Integrate at least 1 Perfect Corp API and show clear consumer or retail value.
- Project page with short write-up and screenshots.
- Demo video, 1 to 3 minutes, showing the experience end to end.
- Exit interview and a questionnaire if we win. The project must be easy to write up as a case study.

### Judging criteria
1. **Progress** — how much did we actually get built and working.
2. **Concept** — does it solve a real problem.
3. **Feasibility** — could this become a startup or a company.

Every scope decision gets checked against these three. A half-finished ambitious feature scores worse than a complete narrow one.

---

## 4. Hard constraint: no skin analysis

**Do not use any Perfect Corp skin analysis API. Not skin concerns, not Fitzpatrick, not skin simulation, not aging.**

Reason: the same developer won the Perfect Corp track at DevNetwork AI/ML Hackathon 2026 with SkinMatch AI, which was built on skin analysis, and Perfect Corp is currently in commercial partnership talks with him. The sponsor contact is the same person. Any skin analysis in this project makes it read as a sequel rather than a new product, which costs more than the feature is worth.

Build only on the two newest API families instead. Both are recent enough that few competitors will have used them.

---

## 5. Perfect Corp API stack

Docs: https://docs.perfectcorp.com/develop/introduction
Console / credits: https://yce.perfectcorp.com/api-console/en/redeem-code/ (hackathon redeem code page)

### Families we are using

**A. Hair and Beard suite** (released June 2026, 11 APIs, try-on + diagnostics)
- Hair style and hair colour virtual try-on for the look board.
- Hair **diagnostics** for the readiness feature. This is the differentiator, see section 6.

**B. Fashion suite** (released January 2026, 9 APIs)
- Earrings, necklace, ring try-on for bridal jewellery.
- Others available if useful: watches, bracelets, scarves, hats, shoes, bags.

**C. Makeup try-on** (13 makeup categories, real-time AR + face analysis)
- Full-face bridal makeup looks.

### Integration notes
- Get the API key from the console and put it in `.env.local`. **Never commit it.** Never expose it to the browser.
- All Perfect Corp calls go through Next.js route handlers on the server. The client never sees the key.
- The YouCam API generally follows an upload → create task → poll for result pattern rather than a single synchronous call. **Verify the exact endpoints, request shape, and polling behaviour against the live docs before writing the client.** Do not assume from memory.
- Credits are finite. Build a local fixture cache: store every successful API response as JSON next to a hash of the input, and replay from cache during UI work. This protects the demo day budget and makes the demo reproducible.
- Rate limits and cold latency are unknown. Assume calls take seconds, not milliseconds, and design the UI around that from the start rather than retrofitting loading states later.

---

## 6. The differentiating feature: Hair Readiness

This is the part that makes the project unexpected, and it is the thing to protect if time runs out on anything else.

Everyone uses try-on to answer *"what will this look like?"*. Almost nobody uses hair diagnostics to answer *"can my hair actually get there by the wedding?"*.

Flow:
1. Bride uploads a photo and sets her wedding date.
2. Hair diagnostics reads current hair condition.
3. She picks a target bridal hairstyle via try-on.
4. The app returns a readiness verdict against the timeline: reachable as is, reachable with preparation, or not reachable by that date.
5. If preparation is needed, it produces a simple month-by-month prep plan leading up to the wedding.

Why it scores:
- **Concept:** a real failure mode that currently gets discovered too late to fix.
- **Feasibility:** opens a second revenue line beyond MUA subscriptions, namely referrals to hair treatment and salon partners.
- **Unexpected use case:** the challenge explicitly asks for creative and unexpected uses of the APIs. Diagnostics-for-planning instead of diagnostics-for-retail is exactly that.

The readiness logic itself is our own rule layer on top of the diagnostic output plus the date delta. Keep the rules transparent and explainable in the UI. A visible "why" beats a black box for both judges and users.

---

## 7. Tech stack

Keep it boring and fast. Four days, solo.

- Next.js 15, App Router, TypeScript.
- Tailwind.
- Server-side route handlers for every Perfect Corp call.
- Deploy on Vercel.
- **Persistence: as little as possible.** A look board should be shareable via URL. Prefer encoding state in the share link or storing generated boards in a single simple table. Do not build auth, user accounts, or a dashboard. If a database is not clearly needed by end of Day 1, do not add one.

Guardrails:
- No feature that is not visible in the demo video gets built.
- No refactor after Day 3 starts.
- Mobile-first layout. Brides and MUAs are on phones, and judges will likely open it on one.

---

## 8. Screens

Keep to four. Resist adding a fifth.

1. **Landing** — one sentence pitch, one photo upload, wedding date input. Nothing else.
2. **Look builder** — the core screen. The bride's photo with three stacked controls: makeup, hair, jewellery. Every change re-renders on her face. This screen is the demo.
3. **Readiness** — hair diagnostic verdict against the wedding date, plus the prep plan if needed.
4. **Shared look board** — the artefact she sends to her MUA. Final look, the choices behind it, and the readiness note. This screen is the business case, because it is the thing that gets forwarded and becomes the growth loop.

---

## 9. Build order

**Day 1 (Sun 30 Aug)** — Repo, deploy pipeline live on Vercel from hour one. API key working. One real successful Perfect Corp call end to end, any endpoint, proving auth and the task/poll cycle. Fixture cache in place. Nothing else matters today.

**Day 2 (Mon 31 Aug)** — Look builder screen with all three API families rendering on one uploaded photo. This is the highest-risk day. If the makeup, hair, and jewellery layers cannot be composed together, find that out today, not Wednesday.

**Day 3 (Tue 1 Sep)** — Hair readiness feature and the shared look board. Feature freeze at end of day. Anything not working by then gets cut, not fixed.

**Day 4 (Wed 2 Sep)** — No new code. Demo video, project page, screenshots, write-up, submission. Deadline is 00:00 WIB that night.

The most common way solo entrants lose this track is spending Day 4 coding and filming the video in the last hour. The video and the project page are the only things the sponsor judges actually see. Treat Day 4 as sacred.

---

## 10. Demo video plan (1 to 3 minutes)

Shoot the story, not the feature list.

1. Open on the problem in one sentence, stated as a cost. Trial makeup wasted.
2. Upload, wedding date, straight into the look builder.
3. Build a complete bridal look live. Let the try-on renders carry the moment without narration over them.
4. Hit readiness. Show the verdict and the prep plan. This is the beat that should surprise the viewer.
5. Send the look board. End on the MUA receiving it.
6. Close with who pays and why. One sentence.

Record in Bahasa or English, but subtitle in English. Judges are American.

---

## 11. Open items

- Domain: firstlook.studio or tryfirstlook.com, whichever is available.
- Business model numbers for the Feasibility score are not written yet. See section 3, judges explicitly ask whether this could be a company.
- No MUA validation quotes collected yet.

---

## 12. Progress log

| Date | Session summary | State at end |
|---|---|---|
| Sun 30 Aug 2026 | Read the docs down to the raw OpenAPI bundles (`docs.perfectcorp.com/_bundle/reference/<api>.json` — far more reliable than the rendered pages). Scaffolded Next.js 16.3.3 + TS + Tailwind. Built the Perfect Corp client, feature registry and fixture cache. **One real hair try-on end to end: HTTP 200, 7.4s over 5 polls, 2 units.** Repeat call served from cache in 4ms for 0 units. | Day 1 goal met: auth, upload, task, poll and cache proven live. |
| Mon 31 Aug 2026 | Audited all 29 APIs and confirmed every registered version is the newest. Generalised to `/api/tryon/[feature]` + `/api/templates/[feature]` + `/api/features`, **30 features registered**. Mirrored 10 makeup pattern catalogues (4,458 patterns). Proved 7 of 9 request families live. **Found the `styled` fashion family is generative, not a try-on** — and turned that into the prewedding concept generator (`/prewedding`, 8 concepts, 3 verified). Wrote `docs/FINDINGS.md` and `scripts/smoke.sh` (18/18, zero units). Built the empty Nusantara reference library. Shipped: 11 commits to GitHub, deployed to Vercel, git auto-deploy verified. ~32 units spent in total. | **Deployed and auto-deploying.** Day 2 work done. |

### Where to pick up (Day 3, Tue 1 Sep)

Per section 9, Day 3 is **Hair Readiness + shared look board, then feature freeze.**
Day 4 is video, project page and submission only — no new code.

Ready to build on:
- All four diagnostics are registered and the JSON result path is proven live —
  `hairLengthDetection` returned `{"hair_length":{"term":"ear length"}}` in 5.8s.
- **Hair type and frizziness need exactly 3 photos** (front, right, left);
  length and density need 1. Full diagnostic sweep costs 7 units per bride.
- The readiness verdict is our own rule layer over those four values plus the
  wedding-date delta. Section 6 says keep the rules transparent and explainable.

Two things deliberately left undone:
1. **Fixtures must be regenerated** from a photo you own before the repo goes
   public or the demo is filmed — see `fixtures/README.md`. This is why the repo
   is private.
2. **`public/references/` is empty** — 13 declared slots for kebaya, hijab and
   regional makeup, parked until you source the images.

**`docs/ASSETS.md` is the shooting and sourcing spec for both** — exact framing,
measured face-size limits, the 13 filenames, and where each file goes.

### Deploy facts

- Repo `Zenidp/first-look`, **private**. Vercel GitHub App was granted access manually; `vercel git connect` cannot do that for a private repo on its own.
- Production alias `https://first-look-five.vercel.app`.
- Vercel env: `PERFECTCORP_API_KEY` on Production/Preview/Development, `PERFECTCORP_OFFLINE=1` on Preview only.
- Vercel's runtime filesystem is read-only, so the deployed app **replays** fixtures and never writes new ones. A cache miss in production still runs a real, billable call — that is intended, but it means the demo should only walk paths that already have fixtures.
- `npm run smoke` needs a running server and `PHOTO=<a jpg>`; it spends nothing when `PERFECTCORP_OFFLINE=1`.

### Verified API facts (do not re-derive)

- Auth is **`Authorization: Bearer <API_KEY>`** only. No token exchange, no expiry. The console's "secret key" is a 1024-bit RSA **public** key for the legacy `/s2s/v1.0/client/auth` flow and is unused here — it is not a secret.
- Base URL `https://yce-api-01.makeupar.com`, single global host.
- Every feature is the same shape: `POST /s2s/<ver>/task/<name>` → `{data:{task_id}}`, then `GET /s2s/<ver>/task/<name>/{task_id}` until `task_status` is `success`/`error`. Adding a feature = one entry in `src/lib/perfectcorp/features.ts`.
- Hair try-on v2.1 costs **2 units**. Upload, polling and template listing cost **0**.
- **Measured latency: 7.4s** (docs never state one). Poll at 1.5s, timeout at 90s.
- Result URLs expire in **2 hours**; uploaded files live 30 days; `task_id` queryable 24 hours. The fixture cache therefore downloads the image, never just the URL.
- Rate limit 250 requests / 300s, per key *and* per IP. Aim for ≤5 QPS.
- Image specs: jpg/jpeg only, <10MB, long side ≤1024px, face width ≥128px, single face, frontal, **shoulders visible**. Downscaling happens in the browser (canvas) to avoid a `sharp` dependency.
- Abandoning a running task can still be charged — always poll to a terminal state.
- **Only two APIs have multiple versions**: hair style (v1.0 → v2.0 → **v2.1**) and clothes (V2.0 → V3.0 → **V4.0**). Every other endpoint is single-version, so "use the latest" is already settled everywhere else.
- **cloth-v4 dropped `template_id`.** The outfit catalogue (250 items) only works on the older V2.0 `cloth` endpoint. Both are registered: `clothes` (V4, reference only) and `clothesTemplates` (V2.0, catalogue).
- **The `styled` family — scarf, hat, shoes, bag — generates a whole new scene** rather than editing her photo. Measured, not documented. Keep it off the look board.
- Nine distinct request shapes, not one. See the family table at the top of `features.ts`; the 2D jewellery suite needs `source_info` and `object_infos` *in addition to* the flat file ids.
- Hair **type** and **frizziness** detection require exactly 3 photos (front, right, left). Length and density take 1.
- Template ids are not titles: the Wedding look "Ethereal" is `all_ethereal`. Always read `id`.
- Bridal catalogue coverage is thin and Western: look-vto has 3 Wedding looks, cloth has 4 Wedding outfits and 16 Cultural Attire pieces with **no kebaya**. Indonesian looks must go through custom reference images — which is itself the localisation story.

### Measured latency (docs state none)

| Feature | Poll time | Polls |
|---|---|---|
| Hair style v2.1 | 7.4s | 5 |
| Clothes (wedding gown) | 7.6s | 5 |
| Makeup full look | ~6s | 4 |
| Hair length detection | 5.8s | 4 |
| Hair colour | 4.2s | 3 |
| Scarf (generative) | 12.8s | 9 |
