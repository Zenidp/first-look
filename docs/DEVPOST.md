## Inspiration

A bridal trial in Jakarta costs Rp 1.5–4 million and half a day, and it regularly ends in a look the bride does not want. She and her juru rias have been working from Pinterest screenshots of other people's faces. There is no shared reference on *her* face until the money is already spent.

The quieter half of the problem is worse. When a bridal hairstyle fails, it is usually not the stylist — it is hair condition: length, texture, frizz. Nobody checks that months out, when it could still be fixed. She finds out at the trial, weeks before the wedding, when the only remaining option is a different style.

Everyone uses virtual try-on to answer *"what would this look like?"*. Almost nobody uses hair diagnostics to answer *"can my hair actually get there by the wedding?"* That second question is the reason this project exists.

## What it does

**First Look** is a bridal look studio for Indonesian makeup artists and their clients. It does two things.

**1. One real photograph of the whole look.** She uploads one waist-up photo, then picks her own kebaya, sanggul, makeup, kalung and anting. Five Perfect Corp try-ons run in sequence, each one against the previous result, and the last step returns a single genuine photograph — not a collage, not a mood board. Then it animates that photo into a 5-second clip, because a still cannot show how a kebaya moves. Ring, bracelet and nail try-ons sit beside it as detail tiles.

A wedding has two people in it, so the builder has a subject toggle: the groom gets beskap, a men's haircut and beard try-on through the same chain.

**2. Hair Readiness — the part nobody expects.** She sets her wedding date and picks a target style. Three Perfect Corp hair diagnostics read her current hair, and a rule layer turns the readings plus the date delta into one of three verdicts:

- **Ready** — her hair can do this today.
- **Ready with preparation** — here is a month-by-month plan to get there.
- **Not by then** — with the arithmetic shown, and reachable alternatives offered instead.

Every verdict opens up. "Why this result?" shows which reading and which threshold decided it, and which numbers are the API's versus mine. A bride told "not by then" deserves to see the reasoning, not a black box.

**Who pays is the makeup artist, not the bride.** This is a B2B2C tool for a service professional who already has clear revenue per client — and the finished look board is the artefact the bride forwards to her MUA, which is also the growth loop.

## How I built it

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, deployed on Vercel. Solo, four days.

- **Every Perfect Corp call goes through a server route handler.** The API key never reaches the browser. One feature registry (`features.ts`) describes all **31 registered APIs** — nine distinct request shapes across hair, beard, fashion, makeup, jewellery, diagnostics and video — so adding a feature is one entry, not one route.
- **The look chain** applies passes largest-affected-area first: garment → hair → makeup → necklace → earrings. Order is structural, not cosmetic. A necklace applied before the kebaya simply disappears under it.
- **A two-layer result cache.** Every successful response is stored against a hash of its exact inputs; committed fixtures are layer one, Supabase Storage is layer two. The entire demo path — five-step chain, video, both hair verdicts — replays for **zero API units in production, in about 85ms**.
- **Hair Readiness is my own rule layer**, built on the endpoints' published enums (8 length bands, 9 curl bands, 4 frizziness levels) plus an average growth rate of ~1.25cm/month. Every threshold is a named constant with its reasoning attached, and the UI marks which figures are estimates.
- **No third-party imagery anywhere.** The demo bride and groom are synthetic identities I generated, along with the 18-image reference library — 8 Nusantara garments, 5 regional makeup looks, jewellery products. That cleared the licensing problem and meant no real person's face is in the demo.

## Challenges I ran into

**The catalogue has no kebaya.** Perfect Corp's bridal coverage is thin and Western: 3 wedding looks, 4 wedding outfits, 16 cultural attire pieces, no Indonesian bridal anything. That is not a complaint — it is the product. Everything Indonesian goes through custom reference images, which is exactly the localisation layer a local competitor cannot skip.

**No single photo could carry the whole chain.** A full-body shot puts her face at ~75px, under the documented 128px minimum, so makeup and jewellery are unreachable. A face shot has no torso for the garment engine to dress. Waist-up is the only framing that satisfies both ends, and finding that out cost a run.

**The hair blocked the earrings.** The first complete chain composited four layers beautifully, then died on the last step: `earlobe alignment not confident`. Loose waves had covered both ears. No step order fixes that — you cannot photograph an earring the hair is covering. The fix is an updo, which is what a bridal sanggul is anyway.

**Hair Density rejects every photo.** Three attempts, three billed units, `error_face_angle_invalid` on frontal *and* three-quarter shots — both of which its own error message says are supported. I stopped at three and shipped Readiness on the three diagnostics that work, with density's absence documented in the code rather than silently omitted.

**The diagnostic answers about the photo, not the person.** The same bride read `2A to 2B` with her hair loose and `1 to 2A` with it in a bun — a full band apart. A verdict that moves with how she wore her hair that morning is not a verdict, so the UI insists on loose hair and states what the reading was based on.

**Vercel's filesystem is read-only,** which meant nothing generated in production could ever be cached and every look a real visitor built would be billed again in full. Supabase closed that leak on day three.

**A failed AI task is still billed.** Only a creation-time rejection is free, so the client always polls to a terminal state and never abandons a running task.

## Accomplishments that I'm proud of

- **One real photograph of a complete Indonesian bridal look**, built from five stacked try-ons on the bride's own face — kebaya, sanggul, makeup, kalung, anting — and then brought to life as video.
- **Hair Readiness works, and it is honest.** The same measured bride produces all three verdicts from nothing but a change of date or target style. Nothing in the demo is faked.
- **The whole demo path costs zero units** in production. 31 fixtures hold 60 units of paid results and replay free — the demo is reproducible, and it cannot be broken by a credit balance.
- **All 31 APIs verified by eye**, not just by HTTP 200, with a 33-check smoke suite that runs offline and spends nothing.
- Everything measured against the live API that the docs get wrong or omit is written down in `FINDINGS.md` — latencies, billing behaviour, payload shapes, engine limits.

## What I learned

Read the OpenAPI bundles, not the rendered docs. Every diagnostic publishes its full result vocabulary there, while a live response only ever shows you one value at a time. That cost nothing and saved me from inventing a scale. (It also caught a real trap: the spec says `2a to 2b`, the API returns `2A to 2B`.)

Measure instead of assuming. Negative prompts never once steered the video camera — the motion description did, and finding that recovered the hem and shoes that a "less motion" prompt had cropped out. And two still frames cannot tell you whether a clip is calm; I ended up scoring mean frame-to-frame change to settle it.

The most valuable finding was a non-feature: the generative fashion family builds a whole new scene rather than editing her photo. Wrong for a look board, so it stays off it — and right for a pre-wedding concept generator, which is where it went instead.

Finally: a half-finished ambitious feature scores worse than a complete narrow one. I froze features on day three and spent the last day on the submission, which is the opposite of what I wanted to do and almost certainly the right call.

## What's next for First Look Studio

- **Shareable look boards.** The table already exists in the schema — a link the bride sends her MUA, with the look, the choices behind it and the readiness note attached. That is the growth loop.
- **A deeper Nusantara library.** Eight garments is a start; Indonesia has far more than eight bridal traditions, and this is the part no global catalogue will build.
- **Real designer and MUA photography** in place of the generated reference stand-ins, and MUA review of the regional makeup references — paes ageng and suntiang especially.
- **The second revenue line:** readiness verdicts that say "with preparation" are qualified referrals to salons and hair treatment partners, months before the wedding, at the exact moment the bride is motivated to act.
- MUA-facing accounts, so a bridal sanggar can run this across a whole season of clients.
