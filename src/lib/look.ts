import type { FeatureId } from "./perfectcorp/features";

/**
 * The composite look chain.
 *
 * Every other surface in this app runs one feature against the bride's photo
 * and shows the result on its own. That leaves her with five separate pictures
 * — one wearing the kebaya, one with the hair, one with the earrings — and no
 * single image of the look she actually chose.
 *
 * A chain fixes that by feeding each step's OUTPUT into the next step's INPUT.
 * The result is one genuine photograph of her wearing everything, not a
 * collage: each pass is a real try-on against the real frame.
 *
 * ---------------------------------------------------------------------------
 * Two constraints shape this, and neither is negotiable.
 *
 * 1. ONE FRAME HAS TO CARRY THE WHOLE CHAIN, and until half-body.jpg existed
 *    none could. full-body.jpg puts the face at roughly 75px wide, under the
 *    API's documented 128px minimum, so makeup, hair and jewellery are all
 *    rejected on it. face-front.jpg has no torso for cloth-v4 to dress. Only a
 *    waist-up frame satisfies both, which is why input/half-body.jpg exists.
 *
 * 2. ORDER IS NOT COSMETIC. Each pass repaints a region and will overwrite
 *    anything already there. The garment repaints the whole torso, so a
 *    necklace applied before it would simply disappear. The rule is largest
 *    affected area first, smallest last:
 *
 *        garment (torso) -> hair (crown and shoulders) -> makeup (face)
 *          -> necklace (collarbone) -> earrings (ears)
 *
 * ---------------------------------------------------------------------------
 * On cost: a chain is NOT covered by the existing single-step fixtures. Step 2
 * reads step 1's output, which is a different image with a different byte hash,
 * so it is a fresh cache key and a real billable call the first time.
 *
 * It self-caches from then on, and that is worth understanding because it is
 * what makes the deployed demo free. Compositing calls return the same
 * dimensions they were given (747x1024 throughout), and prepare-image.ts passes
 * a conforming jpg through untouched, so replaying a chain feeds byte-identical
 * inputs to every step and hits all five fixtures. No chain-level cache needed.
 */

export type LookStep = {
  feature: FeatureId;
  /** Shown in the UI while this step runs. */
  label: string;
  /** Entry in the Nusantara library, for the steps that take a product photo. */
  referenceId?: string;
  options?: Record<string, unknown>;
};

export type LookRecipe = {
  id: string;
  label: string;
  /** Which file in input/ this recipe is built for. */
  photo: string;
  steps: LookStep[];
};

/**
 * The demo recipe. Every reference here is self-made (see FINDINGS section 7 —
 * Perfect Corp's own sample imagery may not be redistributed), and the two
 * template ids are real ids rather than titles: the Wedding look shown as
 * "Ethereal" in the catalogue is `all_ethereal`, and passing the title returns
 * InvalidTemplate.
 */
export const LOOK_RECIPES: LookRecipe[] = [
  {
    id: "jawa-klasik",
    label: "Kebaya Jawa klasik",
    photo: "half-body.jpg",
    steps: [
      {
        feature: "clothes",
        label: "Kebaya",
        referenceId: "kebaya-jawa-klasik",
        // A waist-up frame still reads as full_body to cloth-v4: the category
        // describes the garment, not the crop.
        options: { garmentCategory: "full_body" },
      },
      {
        // An UPDO, not a hair-down style, and the reason is structural rather
        // than aesthetic. Measured 1 Sep 2026: running this chain with
        // `female_s_wave_brunette` composited beautifully and then killed the
        // last step — the loose waves covered both ears, and the earring
        // endpoint failed with "earlobe alignment not confident" after being
        // charged. Any hair-down template makes earrings unreachable, whatever
        // order the steps run in: you cannot photograph an earring that the
        // hair is covering. An updo is also what a bridal sanggul actually is.
        //
        // hairColor 'src' keeps her own colour, which only works because this
        // template reports keep_users_color: true. Without it the template
        // drags its own colour along — the same chain came back strawberry
        // blonde off a brunette source.
        feature: "hairStyle",
        label: "Sanggul",
        options: { templateId: "female_casual_updo", hairColor: "src" },
      },
      {
        feature: "makeupLook",
        label: "Makeup",
        options: { templateId: "all_ethereal" },
      },
      {
        feature: "necklace",
        label: "Kalung",
        referenceId: "necklace-gold-collar",
      },
      {
        feature: "earrings",
        label: "Anting",
        referenceId: "earring-gold-drop",
      },
    ],
  },
];

export function getRecipe(id: string): LookRecipe | undefined {
  return LOOK_RECIPES.find((r) => r.id === id);
}

/**
 * The hand shots can never join the chain — a macro crop of one hand and a
 * waist-up portrait are different photographs of different things, and no
 * try-on composites one into the other. They ride alongside the finished look
 * as detail tiles instead, which is also how a real bridal moodboard is laid
 * out.
 */
export const DETAIL_STEPS: LookStep[] = [
  { feature: "ring", label: "Cincin", referenceId: "ring-gold-solitaire" },
  { feature: "bracelet", label: "Gelang", referenceId: "bracelet-gold-cuff" },
];

/**
 * Default motion prompt for the finished look.
 *
 * Kept deliberately small. The endpoint runs the prompt through Gemini and
 * re-emits it as English, and its own guidance is that short prompts work
 * best; a long one competes with the image rather than describing it. Anything
 * asking for a change of clothing, setting or framing would also undo the five
 * try-ons that produced the still.
 */
export const DEFAULT_VIDEO_PROMPT =
  "The bride smiles gently and turns her head slightly toward the camera. " +
  "Subtle natural motion, soft studio light, the fabric and earrings catching " +
  "the light. The camera holds still.";

export const DEFAULT_VIDEO_NEGATIVE =
  "changing outfit, changing background, changing hairstyle, distorted face, " +
  "extra hands, warping jewellery, camera zoom, cuts, text, watermark";
