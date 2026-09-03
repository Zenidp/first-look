# Devpost submission — copy/paste

**Live:** https://first-look-five.vercel.app
**Repo:** https://github.com/Zenidp/first-look

---

## Tagline (one line)

See the wedding look before you pay for the trial.

---

## Inspiration

A bridal trial in Jakarta costs Rp 1.5–4 million and half a day, and it
regularly ends in a look the bride does not want. The reason is an ordering
problem: the bride and her makeup artist are working from Pinterest screenshots
of *other people's faces*, and the first moment they both see the same thing is
the trial itself — after the money is spent.

There is a second failure underneath it. Bridal hairstyle failures are usually
not a skill problem, they are a hair *condition* problem — length, texture,
damage. That gets discovered at the trial, weeks out, when hair grows about
1.25 cm a month and nothing can be done.

## What it does

**First Look** is a bridal look studio for Indonesian makeup artists and their
clients.

1. **Build the look.** Kebaya, sanggul, makeup, necklace and earrings are
   stacked onto one photo of her own face. Each try-on runs against the previous
   result rather than the original, so the output is one genuine photograph —
   not a collage. It can then be animated into a five-second clip to see how the
   fabric falls.
2. **A groom's path too.** Beskap, haircut and beard, same ordering, four
   regional groom garments. A wedding has two people in it.
3. **Hair readiness — the part nobody else does.** Three diagnostics read her
   hair's length, type and condition, and our own rule layer weighs them against
   the target style and the wedding date. It answers **Ready**, **Ready with
   preparation**, or **Not by then** — with alternatives her current length
   already reaches, a month-by-month plan, and every threshold that fired
   readable on screen.

## How I built it

Next.js 16 (App Router) + TypeScript + Tailwind v4 on Vercel, with every Perfect
Corp call behind a server route handler so the API key never reaches the browser.
Supabase holds a shared fixture cache and a usage ledger.

**31 Perfect Corp APIs are wired up**, each verified by eye rather than by HTTP
200: the Hair & Beard suite, the Fashion suite, makeup try-on, image-to-video,
and the hair diagnostics that Hair Readiness is built on.

The interesting engineering is the **composite chain**. Five try-ons run in
sequence, each against the last one's output. Order is not cosmetic: every pass
repaints a region and overwrites what is under it, so the garment goes first
(it repaints the torso) and the earrings last. Get it wrong and the necklace
simply disappears under the kebaya.

## Challenges

**Everything fails expensively.** A task that is accepted and then fails is
still billed. So impossible combinations are refused in the browser before
anything is uploaded — an updo is required before earrings are offered, because
loose hair covers the earlobes and the earring endpoint fails *after* charging.

**The catalogue has no kebaya.** Audited: three bridal looks and four gowns, all
Western. For a market that marries in kebaya, songket and ulos that is an empty
catalogue, so all 12 regional garments and 5 regional makeup looks go through
custom reference images instead. That constraint turned into the localisation
story.

**One frame has to carry the whole chain.** A full-body photo puts the face at
~75px, under the API's 128px minimum, so makeup, hair and jewellery are all
rejected on it. A face crop has no torso to dress. Only waist-up satisfies both.

**Asking for less motion produced more of it.** A "stands still, minimal motion"
video prompt measured *twice* the frame-to-frame change of "turns slowly" — the
model invents motion to fill five seconds. Measured, not guessed:
`scripts/measure-motion.py`.

## Accomplishments

- The whole demo path **replays for 0 units in production** — 31 committed
  fixtures holding 60 units of paid results, plus a Supabase layer that catches
  the rest. A stranger can use the deployed app for free.
- **Hair diagnostics used for planning rather than retail.** The same measured
  bride produces all three verdicts depending on her date and target. Nothing is
  faked.
- **No third-party imagery anywhere.** Both people, all 22 references, are
  synthetic assets generated for this project.

## What I learned

Read the measurements before trusting the instinct. Two of my own video prompts
were wrong because I reasoned from what sounded right while the repo's own
FINDINGS file already recorded the opposite result.

## What's next

Share links for a finished look board, more Nusantara garments, and MUA
validation on the five regional makeup references.

---

## Built with

`next.js` `typescript` `tailwindcss` `perfect-corp-youcam-api` `supabase`
`vercel` `gemini` `react`

---

## Screenshots to grab (in this order)

1. `/` — the hero before/after pair
2. `/look` — the finished composite look
3. `/look` — the groom composite
4. `/readiness` — a "Not by then" verdict with the plan
5. `/readiness` — "Why this verdict?" expanded

## Demo video script (90 seconds)

| Time | Screen | Say / show |
|---|---|---|
| 0:00 | `/` | "A bridal trial costs 1.5 to 4 million rupiah and often ends in a look she didn't want." |
| 0:10 | `/look` | "Use the sample" → "Build the look". Five try-ons land in ~100ms. Say: one photo, not a collage |
| 0:30 | `/look` | "Animate it" — the still comes alive |
| 0:45 | `/look` | Switch to **Groom** → sample → run. "A wedding has two people in it." |
| 0:55 | `/readiness` | Sample, date **+6 months**, style **Long and sleek** → **Not by then** |
| 1:10 | `/readiness` | Change to **+12 months** → **Ready with preparation**, show the plan |
| 1:20 | `/readiness` | "Why this verdict?" — the visible reasoning |
| 1:30 | — | "The makeup artist pays, not the bride. One trial that isn't wasted covers months." |

**Every step above costs 0 units.** Turn off GlobalProtect and OpenVPN before
recording — both are up on this machine with reduced MTU and the first load
times out through them.

---

# YouTube metadata

## Title (pick one)

First Look — See the Wedding Look Before You Pay for the Trial | Perfect Corp API

*Alternates:*
- First Look: Stacking 5 Try-Ons onto One Photo, Plus "Can Her Hair Get There?"
- First Look — A Bridal Look Studio That Also Tells You If Her Hair Will Be Ready

## Description

A bridal trial in Jakarta costs Rp 1.5–4 million and half a day — and it
regularly ends in a look the bride did not want. First Look settles the look
before the money is spent.

Built solo in four days for the DevNetwork [API + Cloud + AI] Hackathon 2026,
Perfect Corp sponsor track.

WHAT IT DOES
• Stacks kebaya, sanggul, makeup, necklace and earrings onto ONE photo of her
  own face — each try-on runs against the previous result, so the output is a
  real photograph, not a collage
• Animates that still into a five-second clip to show how the fabric falls
• A full groom path too: beskap, haircut and beard, with four regional garments
• Hair Readiness — three diagnostics plus our own rule layer answer whether her
  hair can actually reach the target style by the wedding date

THE PART NOBODY ELSE DOES
Everyone points try-on at "what would this look like?". First Look points hair
diagnostics at "can her hair get there in time?" — returning Ready, Ready with
preparation, or Not by then, with alternatives, a month-by-month plan, and every
threshold visible on screen.

CHAPTERS
0:00 The problem — a wasted bridal trial
0:10 Building the look: five try-ons, one photo
0:30 Animating the still
0:45 The groom — a wedding has two people in it
0:55 Hair Readiness: "Not by then"
1:10 Twelve months out: "Ready with preparation"
1:20 Why this verdict? The visible reasoning
1:30 Who pays, and why

BUILT WITH
Next.js 16 · TypeScript · Tailwind v4 · Perfect Corp YouCam APIs (31 wired up)
· Supabase · Vercel · Gemini for synthetic assets

NOTES
Every face and garment shown is a synthetic image made for this project. No real
bride's photograph and no third-party asset is used anywhere. Try-on results are
a simulation, not a promise about the final makeup.

Live: https://first-look-five.vercel.app
Code: https://github.com/Zenidp/first-look

#PerfectCorp #YouCam #AIBeauty

## Tags (comma-separated, paste into the Tags field)

perfect corp, youcam api, virtual try on, ai beauty, bridal makeup, wedding
makeup, makeup artist tools, bridal look, kebaya, indonesian wedding, sanggul,
beskap, hair diagnostics, hair analysis ai, devnetwork hackathon, api cloud ai
hackathon, hackathon 2026, nextjs, typescript, supabase, vercel, ai try on,
beauty tech, mua tools, wedding planning app, generative video, image to video,
face ai, bridal trial, first look
