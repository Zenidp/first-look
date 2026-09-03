import type { FeatureId } from "./perfectcorp/features";
import type { Framing } from "./photo";

/**
 * What may be combined with what, and why not.
 *
 * This exists because of one property of the platform: a task that is accepted
 * and then fails is still billed (FINDINGS §3). So an impossible combination is
 * not merely a dead end — it is a dead end the bride pays for. Every rule here
 * is enforced in the UI *before* anything is uploaded.
 */

export type Slot = {
  id: string;
  feature: FeatureId;
  label: string;
  /** How the choice is made: a Perfect Corp catalogue, or our own library. */
  source: "template" | "reference";
  /** Extra options merged into the step when this slot is used. */
  options?: Record<string, unknown>;
  optional: boolean;
  hint?: string;
};

/**
 * Order is not cosmetic and is not the user's to set. Each pass repaints its
 * region and overwrites whatever is already there, so the largest affected area
 * has to go first — a necklace applied before the kebaya simply disappears
 * under it. The bride picks *what*; the system decides *when*.
 */
export const SLOTS: Record<Framing, Slot[]> = {
  beauty: [
    {
      id: "clothes",
      feature: "clothes",
      label: "Garment",
      source: "reference",
      options: { garmentCategory: "full_body" },
      optional: true,
      hint: "Kebaya, regional dress or a gown. Applied first, because it repaints the whole body.",
    },
    {
      id: "hairStyle",
      feature: "hairStyle",
      label: "Hair",
      source: "template",
      options: { hairColor: "src" },
      optional: true,
      hint: "Choose an updo if you want earrings — see the note below.",
    },
    { id: "makeupLook", feature: "makeupLook", label: "Makeup", source: "template", optional: true },
    { id: "necklace", feature: "necklace", label: "Necklace", source: "reference", optional: true },
    { id: "earrings", feature: "earrings", label: "Earrings", source: "reference", optional: true },
  ],
  outfit: [
    {
      id: "clothes",
      feature: "clothes",
      label: "Garment",
      source: "reference",
      options: { garmentCategory: "full_body" },
      optional: false,
      hint: "On a full-body frame the garment is the only thing that can be applied. Why, below.",
    },
  ],

  /**
   * The groom. Same ordering law as the bride — largest repainted area first —
   * so the beskap goes on before anything is done to his head.
   *
   * There is no jewellery here and no makeup, which is not an omission: the
   * necklace and earring endpoints are built around a bridal neckline and an
   * earlobe, and a groom's look is carried by the outfit, the hair and the
   * beard. Adding slots that would mostly fail is worse than not offering them,
   * because a failure after task creation is still billed.
   */
  groom: [
    {
      id: "clothes",
      feature: "clothes",
      label: "Garment",
      source: "reference",
      options: { garmentCategory: "full_body" },
      optional: true,
      hint: "Beskap, regional dress or a suit. Applied first, because it repaints the whole body.",
    },
    {
      id: "hairStyle",
      feature: "hairStyle",
      label: "Hair",
      source: "template",
      options: { hairColor: "src" },
      optional: true,
      hint: "The catalogue carries eight men's cuts.",
    },
    {
      // Last, and deliberately so: beard-style repaints the jaw, and anything
      // run after it would have to paint over a beard it does not know about.
      id: "beardStyle",
      feature: "beardStyle",
      label: "Beard",
      source: "template",
      optional: true,
      hint: "15 styles, including 'Shaved' to keep him clean.",
    },
  ],

  groomOutfit: [
    {
      id: "clothes",
      feature: "clothes",
      label: "Garment",
      source: "reference",
      options: { garmentCategory: "full_body" },
      optional: false,
      hint: "On a full-body frame the garment is the only thing that can be applied. Why, below.",
    },
  ],
};

/**
 * Why the full-body frame carries only one slot.
 *
 * Measured, not assumed: a full-body frame puts the face at roughly 75px, under
 * the API's documented 128px minimum, so makeup, hair and jewellery are all
 * rejected on it. Showing the reason beats hiding the controls — the bride
 * should understand the trade rather than wonder what is missing.
 */
export const OUTFIT_LIMITATION =
  "On a full-body photo the face is too small for makeup, hair and jewellery — " +
  "the API refuses anything under 128 pixels. Use the waist-up look for those.";

/**
 * Hair styles that leave the earlobes visible.
 *
 * ONLY the first entry is measured. On 1 Sep 2026 a full chain using
 * `female_s_wave_brunette` composited four layers correctly and then failed on
 * the earrings with "earlobe alignment not confident" — the loose waves had
 * covered both ears — and that failure was billed. `female_casual_updo` was then
 * verified to complete the same chain.
 *
 * The rest are classified from their catalogue titles, not from a test run. That
 * is an inference, so the UI offers an override rather than a hard block: a
 * style outside this list is *probably* incompatible with earrings, and the
 * bride is told the risk and the price before she chooses to try it.
 */
export const EARS_CLEAR_HAIR = new Set([
  "female_casual_updo", // measured to work
  "female_bangs_updo",
  "female_messy_bun",
  "female_messy_bun_brown",
  "all_dark_kitty_bun",
  "all_spiral_buns",
  "all_curly_double_buns",
  "all_curly_space_buns",
  "all_violet_space_buns",
  "all_high_pony_tail",
  "female_two_braids",
  "all_bubble_braids",
]);

export type Selection = Record<string, { id: string; label: string } | undefined>;

export type SlotIssue = {
  slot: string;
  /** blocked = we have measured this fails. risky = inferred, overridable. */
  level: "blocked" | "risky";
  message: string;
};

/**
 * Everything wrong with a selection, before a single unit is spent.
 */
export function checkSelection(framing: Framing, selection: Selection): SlotIssue[] {
  const issues: SlotIssue[] = [];
  if (framing !== "beauty") return issues;

  const hair = selection.hairStyle;
  const earrings = selection.earrings;

  if (earrings && hair && !EARS_CLEAR_HAIR.has(hair.id)) {
    issues.push({
      slot: "earrings",
      level: "risky",
      message:
        `"${hair.label}" probably covers the ears, and the earrings will fail with ` +
        `"earlobe alignment not confident" — a failure that is still billed. ` +
        "Choose an updo, or skip the earrings.",
    });
  }

  return issues;
}

/** True when the selection can be run without a known-billed failure. */
export function isRunnable(framing: Framing, selection: Selection): boolean {
  const slots = SLOTS[framing];
  const chosen = slots.filter((s) => selection[s.id]);
  if (chosen.length === 0) return false;
  if (slots.some((s) => !s.optional && !selection[s.id])) return false;
  return !checkSelection(framing, selection).some((i) => i.level === "blocked");
}
