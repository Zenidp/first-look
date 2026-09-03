/**
 * Hair Readiness — can her hair actually reach the style she wants by the
 * wedding date?
 *
 * Everyone uses try-on to answer "what would this look like?". This answers a
 * question nobody asks until it is too late to fix: bridal hairstyle failures
 * are usually a hair *condition* problem — length, texture, damage — and they
 * are discovered at the trial, weeks out, when the only remaining option is a
 * different style.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS MEASURED AND WHAT IS OURS
 *
 * Perfect Corp returns four attributes. This file turns three of them plus a
 * date into a verdict, and every threshold below is OURS — a rule layer, not an
 * API output. They are written as named constants with the reasoning attached
 * because CONTEXT §6 asks for a visible "why": a bride told "not by then"
 * deserves to see which number said so.
 *
 * The bands themselves come from the endpoints' own OpenAPI enums, not from
 * guesswork:
 *   hair type        9 bands, "1 to 2a" (straight) .. "4b to 4c" (coily)
 *   hair length      8 bands, "above the ears" .. "long hair"
 *   hair frizziness  4 bands, mapping 0..3, "Not Frizzy" .. "Extreme Frizzy"
 *
 * Hair DENSITY is deliberately absent. Measured 2 Sep 2026: it rejected every
 * photo in this project — front-facing and side-facing alike — with
 * `error_face_angle_invalid`, whose own message says both are supported. Three
 * attempts, three units, no result. See FINDINGS §10.
 *
 * ---------------------------------------------------------------------------
 * THE ASYMMETRY THAT MAKES THIS WORTH BUILDING
 *
 * Hair can be cut in an afternoon and grows about 1.25cm a month. So a target
 * that needs LESS length than she has is always reachable, and one that needs
 * MORE is gated by arithmetic nobody does in their head six months out.
 */

// --- the measured bands -----------------------------------------------------

/**
 * Length bands in the endpoint's own order, shortest first. Verified against
 * the `BasicFaceAttrReqHairLength` enum in the OpenAPI bundle.
 */
export const LENGTH_BANDS = [
  "above the ears",
  "ear length",
  "ear length or longer",
  "short hair",
  "short hair or longer",
  "above chest",
  "above chest or longer",
  "long hair",
] as const;

export type LengthBand = (typeof LENGTH_BANDS)[number];

/**
 * Rough centimetres from crown for each band, so growth can be turned into
 * band changes.
 *
 * These are OUR estimates, not API values — the endpoint returns a word, not a
 * measurement. They only need to be good enough to say "about four months",
 * and the UI says "about" for exactly that reason.
 */
const BAND_CM: Record<LengthBand, number> = {
  "above the ears": 10,
  "ear length": 15,
  "ear length or longer": 20,
  "short hair": 25,
  "short hair or longer": 30,
  "above chest": 40,
  "above chest or longer": 50,
  "long hair": 60,
};

/**
 * Scalp hair grows roughly 1.25 cm (half an inch) per month. Widely reported
 * average; individual rates vary, which is why every estimate here is given as
 * a range rather than a date.
 */
const GROWTH_CM_PER_MONTH = 1.25;

/** Curl bands, straightest first, from `BasicFaceAttrRespHairType`. */
export const TYPE_BANDS = [
  "1 to 2a", "2a to 2b", "2b to 2c", "2c to 3a", "3a to 3b",
  "3b to 3c", "3c to 4a", "4a to 4b", "4b to 4c",
] as const;

/** The API returns "2A to 2B" where the spec says "2a to 2b". Compare folded. */
export function typeIndex(mapping: string): number {
  return TYPE_BANDS.indexOf(mapping.trim().toLowerCase() as (typeof TYPE_BANDS)[number]);
}

export function lengthIndex(term: string): number {
  return LENGTH_BANDS.indexOf(term.trim().toLowerCase() as LengthBand);
}

// --- what a style needs -----------------------------------------------------

export type StyleTarget = {
  id: string;
  label: string;
  /** Perfect Corp template id, so the same target drives the try-on. */
  templateId: string;
  /** Shortest length this style can be built from. */
  needsLength: LengthBand;
  /**
   * How much natural curl the style tolerates before it needs to be worked
   * against, as an index into TYPE_BANDS. Beyond it the style is still
   * possible, but it becomes a styling job on the day rather than a natural
   * fit — which is worth saying out loud, not hiding.
   */
  toleratesCurlUpTo: number;
  /** Frizz level (0-3) above which the look needs treatment lead time. */
  toleratesFrizzUpTo: number;
  why: string;
};

/**
 * A curated bridal set rather than all 116 catalogue templates.
 *
 * Classifying every template by length requirement would mean inventing data
 * for 100+ styles nobody will pick, and inventing it invisibly. These are the
 * ones a bride actually chooses between, each with a stated requirement.
 * Every templateId here is real and on the ears-clear list where it matters.
 */
export const STYLE_TARGETS: StyleTarget[] = [
  {
    // Every other target here needs "short hair" or more. Without this one, a
    // bride with ear-length hair has no reachable option at all and the feature
    // only ever tells her no — which is a worse product than not asking.
    id: "sleek-bob",
    label: "Sleek bob",
    templateId: "female_slicked_back_bob",
    needsLength: "ear length",
    toleratesCurlUpTo: 3,
    toleratesFrizzUpTo: 1,
    why: "A polished style designed for short hair — nothing to wait for.",
  },
  {
    id: "sanggul-updo",
    label: "Sanggul / updo",
    templateId: "female_casual_updo",
    needsLength: "short hair or longer",
    toleratesCurlUpTo: 4, // through 3a-3b; tighter curls shrink a lot when gathered
    toleratesFrizzUpTo: 1,
    why: "The hair has to be long enough to gather and pin cleanly.",
  },
  {
    id: "messy-bun",
    label: "Loose bun",
    templateId: "female_messy_bun",
    needsLength: "short hair",
    toleratesCurlUpTo: 6,
    toleratesFrizzUpTo: 2,
    why: "A loose bun forgives texture — it actually wants some volume.",
  },
  {
    id: "high-pony",
    label: "High ponytail",
    templateId: "all_high_pony_tail",
    needsLength: "above chest",
    toleratesCurlUpTo: 5,
    toleratesFrizzUpTo: 1,
    why: "The tail has to visibly fall, so it needs length below the shoulder.",
  },
  {
    id: "braids",
    label: "Twin braids",
    templateId: "female_two_braids",
    needsLength: "above chest",
    toleratesCurlUpTo: 8, // braiding suits every texture
    toleratesFrizzUpTo: 2,
    why: "Braiding needs length, but suits every hair texture.",
  },
  {
    id: "soft-waves",
    label: "Soft waves, half up",
    templateId: "all_half_up_soft_waves",
    needsLength: "above chest or longer",
    toleratesCurlUpTo: 3,
    toleratesFrizzUpTo: 0,
    why: "Worn down, every strand shows — so length and condition are both on display.",
  },
  {
    // The only target that sits at the top length band. It exists because it is
    // a real bridal look, and because without it every hair this project can
    // measure comes back "ready" — a verdict engine that has only ever said yes
    // has not been shown to work.
    id: "long-sleek",
    label: "Long and sleek",
    templateId: "female_sleek_middle_part",
    needsLength: "long hair",
    toleratesCurlUpTo: 2,
    toleratesFrizzUpTo: 0,
    why: "Needs full length and a smooth surface — the most demanding style on this list.",
  },
];

// --- the verdict ------------------------------------------------------------

export type Diagnosis = {
  /** e.g. "2A to 2B" */
  typeMapping?: string;
  typeTerm?: string;
  /** e.g. "above chest or longer" */
  lengthTerm?: string;
  /** 0-3 */
  frizzMapping?: number;
  frizzTerm?: string;
};

export type Blocker = {
  kind: "length" | "curl" | "frizz";
  /** Plain-language statement of the gap. */
  message: string;
  /** Months of growth needed. Only set for length. */
  monthsNeeded?: number;
};

export type Verdict = "ready" | "prep" | "not_by_date" | "unknown";

export type PlanStep = { when: string; action: string };

export type Readiness = {
  verdict: Verdict;
  headline: string;
  monthsAvailable: number;
  blockers: Blocker[];
  plan: PlanStep[];
  /** Every rule that fired, for the "why" panel. */
  reasoning: string[];
  /**
   * Ways out, when the date cannot be met by waiting.
   *
   * A verdict of "no" with nothing after it is a dead end, and a bride reading
   * it six months out still has to walk into the salon with a decision. There
   * are exactly two honest answers when length is the blocker — pick a style
   * her current length reaches, or add extensions — and this app can already
   * show both: every reachable target is a try-on, and `hairExtension` is a
   * registered feature whose whole purpose is showing what extensions buy.
   */
  alternatives: Alternative[];
};

export type Alternative =
  | { kind: "style"; targetId: string; label: string; note: string }
  | { kind: "extensions"; note: string };

/** Whole months between now and the wedding, never negative. */
export function monthsUntil(weddingDate: Date, from = new Date()): number {
  const months =
    (weddingDate.getFullYear() - from.getFullYear()) * 12 +
    (weddingDate.getMonth() - from.getMonth()) +
    (weddingDate.getDate() >= from.getDate() ? 0 : -1);
  return Math.max(0, months);
}

/**
 * The rule layer.
 *
 * Deliberately boring and readable: three checks, each of which can produce a
 * blocker, and a verdict that is the worst of them. A bride who is told "not by
 * then" can read exactly which check said so and what number it used.
 */
export function assessReadiness(
  diagnosis: Diagnosis,
  target: StyleTarget,
  weddingDate: Date,
  now = new Date(),
): Readiness {
  const monthsAvailable = monthsUntil(weddingDate, now);
  const blockers: Blocker[] = [];
  const reasoning: string[] = [];

  // --- length: the only blocker that time can fix ---------------------------
  const have = diagnosis.lengthTerm ? lengthIndex(diagnosis.lengthTerm) : -1;
  const need = LENGTH_BANDS.indexOf(target.needsLength);

  if (have < 0) {
    reasoning.push("Hair length was not read, so this check was skipped.");
  } else if (have >= need) {
    reasoning.push(
      `Length is sufficient: "${diagnosis.lengthTerm}" already meets "${target.needsLength}".`,
    );
  } else {
    const gapCm = BAND_CM[target.needsLength] - BAND_CM[LENGTH_BANDS[have]];
    const monthsNeeded = Math.ceil(gapCm / GROWTH_CM_PER_MONTH);
    blockers.push({
      kind: "length",
      monthsNeeded,
      message:
        `About ${gapCm} cm more is needed — roughly ${monthsNeeded} months, ` +
        `assuming average growth of ${GROWTH_CM_PER_MONTH} cm a month.`,
    });
    reasoning.push(
      `Length falls short: "${diagnosis.lengthTerm}" is under the required "${target.needsLength}" ` +
        `(a gap of about ${gapCm} cm).`,
    );
  }

  // --- curl: not a time problem, a styling one ------------------------------
  const curl = diagnosis.typeMapping ? typeIndex(diagnosis.typeMapping) : -1;
  if (curl < 0) {
    reasoning.push("Hair type was not read, so this check was skipped.");
  } else if (curl <= target.toleratesCurlUpTo) {
    reasoning.push(`Texture fits: "${diagnosis.typeTerm}" is within what this style tolerates.`);
  } else {
    blockers.push({
      kind: "curl",
      message:
        `Her texture (${diagnosis.typeTerm}) is curlier than this style sits comfortably with. ` +
        "Still possible, but it becomes styling work on the day — talk it through with the artist.",
    });
    reasoning.push(
      `Texture is outside tolerance: "${diagnosis.typeMapping}" passes this style's limit.`,
    );
  }

  // --- frizz: fixable, but needs lead time ----------------------------------
  const frizz = diagnosis.frizzMapping;
  if (frizz === undefined) {
    reasoning.push("Frizz level was not read, so this check was skipped.");
  } else if (frizz <= target.toleratesFrizzUpTo) {
    reasoning.push(`Hair condition is adequate: "${diagnosis.frizzTerm}".`);
  } else {
    blockers.push({
      kind: "frizz",
      message:
        `Her hair reads "${diagnosis.frizzTerm}", and this style looks best on smoother hair. ` +
        "A regular treatment routine 2-3 months before the day makes a large difference.",
    });
    reasoning.push(`Frizz is above what this style tolerates ("${diagnosis.frizzTerm}").`);
  }

  // --- verdict --------------------------------------------------------------
  if (have < 0 && curl < 0 && frizz === undefined) {
    return {
      verdict: "unknown",
      headline: "No diagnostic results yet.",
      monthsAvailable,
      blockers: [],
      plan: [],
      reasoning: ["Run the hair diagnostics first."],
      alternatives: [],
    };
  }

  const lengthBlocker = blockers.find((b) => b.kind === "length");
  const needsMoreTimeThanThereIs =
    lengthBlocker?.monthsNeeded !== undefined && lengthBlocker.monthsNeeded > monthsAvailable;

  const verdict: Verdict = needsMoreTimeThanThereIs
    ? "not_by_date"
    : blockers.length > 0
      ? "prep"
      : "ready";

  return {
    verdict,
    headline: headlineFor(verdict, target, monthsAvailable, lengthBlocker),
    monthsAvailable,
    blockers,
    plan: buildPlan(verdict, blockers, monthsAvailable, weddingDate),
    reasoning,
    alternatives: verdict === "not_by_date" ? alternativesFor(have, target) : [],
  };
}

/**
 * What she can do instead, when growth cannot cover the gap in time.
 *
 * Ordered by honesty: styles her hair already reaches come first, because they
 * cost nothing and need no product. Extensions come last because they are a
 * purchase — but they are also the real answer for a bride who wants length she
 * has no time to grow, and pretending otherwise helps nobody.
 */
function alternativesFor(haveIndex: number, rejected: StyleTarget): Alternative[] {
  const out: Alternative[] = [];

  if (haveIndex >= 0) {
    for (const t of STYLE_TARGETS) {
      if (t.id === rejected.id) continue;
      if (LENGTH_BANDS.indexOf(t.needsLength) <= haveIndex) {
        out.push({
          kind: "style",
          targetId: t.id,
          label: t.label,
          note: `${t.why} Her current length already reaches it.`,
        });
      }
    }
  }

  out.push({
    kind: "extensions",
    note:
      "Extensions close the length gap without waiting. Try them here first, so she can " +
      "see the result before deciding.",
  });

  return out;
}

function headlineFor(
  verdict: Verdict,
  target: StyleTarget,
  months: number,
  lengthBlocker?: Blocker,
): string {
  switch (verdict) {
    case "ready":
      return `Her hair is already ready for ${target.label.toLowerCase()}.`;
    case "prep":
      return `Reachable with preparation — there are ${months} months left.`;
    case "not_by_date":
      return (
        `Not by that date: it needs about ${lengthBlocker?.monthsNeeded} months of ` +
        `growth, and there are ${months} months left.`
      );
    default:
      return "No diagnostic results yet.";
  }
}

/**
 * A month-by-month plan, counted backwards from the wedding.
 *
 * Only produces steps for blockers that actually fired — a generic hair-care
 * checklist would be filler, and filler is how a "plan" stops being read.
 */
function buildPlan(
  verdict: Verdict,
  blockers: Blocker[],
  monthsAvailable: number,
  weddingDate: Date,
): PlanStep[] {
  if (verdict === "ready" || verdict === "unknown") return [];

  const plan: PlanStep[] = [];
  const monthName = (offsetFromNow: number) => {
    const d = new Date(weddingDate);
    d.setMonth(d.getMonth() - (monthsAvailable - offsetFromNow));
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (blockers.some((b) => b.kind === "length")) {
    plan.push({
      when: monthName(0),
      action:
        "Stop cutting the length. Take only the thinnest trim off the ends every 8-10 weeks " +
        "to hold off split ends without losing length.",
    });
  }
  if (blockers.some((b) => b.kind === "frizz")) {
    plan.push({
      when: monthName(0),
      action: "Start a regular moisture routine — a weekly mask, less heat styling.",
    });
    if (monthsAvailable >= 3) {
      plan.push({
        when: monthName(Math.max(0, monthsAvailable - 3)),
        action: "A salon treatment (keratin or similar) if she wants one — not in the final month.",
      });
    }
  }
  if (blockers.some((b) => b.kind === "curl")) {
    plan.push({
      when: monthName(Math.max(0, monthsAvailable - 2)),
      action:
        "Show this to her artist at the trial. The texture needs discussing before the day, not on it.",
    });
  }

  plan.push({
    when: monthName(Math.max(0, monthsAvailable - 1)),
    action: "The makeup and hair trial, with the style already chosen here.",
  });

  return plan;
}
