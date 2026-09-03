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
  /** One line on what this look is for, shown above it. */
  blurb: string;
  /** Served from public/demo/ so the browser uploads byte-identical bytes. */
  photo: string;
  steps: LookStep[];
  /**
   * Motion prompt for this look.
   *
   * These strings are part of the fixture key. Editing one by a single
   * character is a cache miss and a real 5-unit call, so treat them as data
   * rather than copy, and change them only alongside a regenerated fixture.
   */
  video: { prompt: string; negativePrompt: string };
};

/**
 * Motion prompts.
 *
 * Kept deliberately small. The endpoint runs the prompt through Gemini and
 * re-emits it as English, and its own guidance is that short prompts work
 * best; a long one competes with the image rather than describing it. Anything
 * asking for a change of clothing, setting or framing would also undo the
 * try-ons that produced the still.
 *
 * Neither of these actually stops the camera pushing in. Measured twice, on
 * both framings, with `camera zoom` in the negative prompt both times — the
 * clip zooms anyway. The negatives are kept because they do constrain the
 * subject (outfit, background, hairstyle), just not the camera. FINDINGS §9.
 */
export const BEAUTY_VIDEO_PROMPT =
  "The bride smiles gently and turns her head slightly toward the camera. " +
  "Subtle natural motion, soft studio light, the fabric and earrings catching " +
  "the light. The camera holds still.";

export const BEAUTY_VIDEO_NEGATIVE =
  "changing outfit, changing background, changing hairstyle, distorted face, " +
  "extra hands, warping jewellery, camera zoom, cuts, text, watermark";

/**
 * The outfit clip asks for a turn rather than an expression: the whole point of
 * animating a full-body frame is watching the kain and the kebaya move, and
 * there is no usable face at this scale to animate anyway (see the recipe).
 *
 * A "stands still, minimal motion" variant was tried and reverted. It kept the
 * feet in frame where this one nearly crops them — but it looked wrong, and the
 * numbers agree: it carries roughly twice this clip's frame-to-frame change
 * (9.98 vs 4.84 mean, 16.31 vs 7.05 peak). Asking for less movement did not get
 * less movement; it got the model inventing motion and warping the subject to
 * fill five seconds.
 *
 * The lesson is about how to judge a clip, not about prompts. Two still frames
 * cannot show motion quality, and that is all the first review of it looked at.
 * FINDINGS §9b.
 */
export const OUTFIT_VIDEO_PROMPT =
  "The bride turns slowly from side to side. The lace kebaya and the batik " +
  "skirt move naturally with her, the fabric catching soft studio light. " +
  "Full body stays in frame.";

export const OUTFIT_VIDEO_NEGATIVE =
  "changing outfit, changing background, cropping the body, distorted face, " +
  "extra limbs, camera zoom, cuts, text, watermark";

/**
 * The groom's clip asks for less motion than the bride's, and that is a
 * structural preference rather than a stylistic one. There is no jewellery to
 * catch the light and no veil to move here, so extra motion buys nothing while
 * widening the model's licence to redraw the face — and a beard composited one
 * step earlier is exactly the detail that drifts first.
 */
export const GROOM_VIDEO_PROMPT =
  "The groom stands still and breathes gently, turning his head very slightly " +
  "toward the camera. Minimal motion, soft studio light. The camera holds still.";

export const GROOM_VIDEO_NEGATIVE =
  "changing outfit, changing background, changing hairstyle, changing beard, " +
  "distorted face, extra hands, camera zoom, cuts, text, watermark";

/**
 * The demo recipes. Every reference here is self-made (see FINDINGS section 7 —
 * Perfect Corp's own sample imagery may not be redistributed), and the two
 * template ids are real ids rather than titles: the Wedding look shown as
 * "Ethereal" in the catalogue is `all_ethereal`, and passing the title returns
 * InvalidTemplate.
 *
 * There are two, and they answer different questions rather than competing.
 * See the note on the second one.
 */
export const LOOK_RECIPES: LookRecipe[] = [
  {
    id: "jawa-klasik",
    label: "Beauty look",
    blurb:
      "Kebaya, sanggul, makeup, kalung dan anting ditumpuk di satu foto yang sama. " +
      "Wajahnya yang jadi subjek.",
    photo: "half-body.jpg",
    video: { prompt: BEAUTY_VIDEO_PROMPT, negativePrompt: BEAUTY_VIDEO_NEGATIVE },
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

  /**
   * The outfit, on the full-body frame. One step, not five — and that is not a
   * simplification, it is the 128px face minimum from FINDINGS §8a showing up
   * from the other side. A full-body frame puts the face at ~75px, so makeup,
   * hair and jewellery are all rejected on it. The garment is the only thing
   * that can be composited here, so the garment is the only thing to animate.
   *
   * Which turns out to be the right clip anyway. Measured 1 Sep 2026: the lace,
   * the batik parang motif, the hem and the silhouette all survive the
   * generative pass and stay readable end to end, so this is how a bride sees
   * the way a kebaya actually moves. The face does not survive as well — at
   * ~65px after the 480p downscale it gets re-synthesised, and drifts off her
   * by the last frame. Hence the labelling in the UI: this clip is the outfit,
   * not her.
   */
  {
    id: "jawa-klasik-outfit",
    label: "Bajunya, saat dipakai",
    blurb:
      "Kebaya dan kain di seluruh badan, lalu digerakkan — untuk melihat jatuhnya " +
      "bahan, panjang kain dan siluetnya.",
    photo: "full-body.jpg",
    video: { prompt: OUTFIT_VIDEO_PROMPT, negativePrompt: OUTFIT_VIDEO_NEGATIVE },
    steps: [
      {
        feature: "clothes",
        label: "Kebaya",
        referenceId: "kebaya-jawa-klasik",
        options: { garmentCategory: "full_body" },
      },
    ],
  },

  /**
   * The groom, on the same two framings and under the same ordering law.
   *
   * Three steps rather than five, and the two that are missing were left out
   * deliberately. The necklace and earring endpoints are built around a bridal
   * neckline and an earlobe; makeup-look is a bridal catalogue. Offering slots
   * that would mostly fail is worse than not offering them, because a task that
   * is accepted and then fails is still billed (FINDINGS §3).
   */
  {
    id: "jawa-groom",
    label: "Look pengantin pria",
    blurb:
      "Beskap, potongan rambut dan jenggot ditumpuk di satu foto yang sama — " +
      "urutan yang sama seperti look pengantin wanita.",
    photo: "groom-half-body.jpg",
    video: { prompt: GROOM_VIDEO_PROMPT, negativePrompt: GROOM_VIDEO_NEGATIVE },
    steps: [
      {
        feature: "clothes",
        label: "Beskap",
        referenceId: "beskap-jawa-groom",
        options: { garmentCategory: "full_body" },
      },
      {
        feature: "hairStyle",
        label: "Rambut",
        // hairColor 'src' for the same reason as the bride's updo: without it
        // the template drags its own colour along, and a black-haired groom
        // comes back several shades lighter than he went in.
        options: { templateId: "male_textured_crop", hairColor: "src" },
      },
      {
        // Beard last. It repaints the jaw, so any step after it would be
        // painting over a beard it has no knowledge of.
        feature: "beardStyle",
        label: "Jenggot",
        options: { templateId: "all_goatee" },
      },
    ],
  },

  {
    id: "jawa-groom-outfit",
    label: "Beskapnya, saat dipakai",
    blurb:
      "Beskap dan kain di seluruh badan, lalu digerakkan — untuk melihat jatuhnya " +
      "bahan dan siluetnya.",
    photo: "groom-full-body.jpg",
    video: { prompt: OUTFIT_VIDEO_PROMPT, negativePrompt: OUTFIT_VIDEO_NEGATIVE },
    steps: [
      {
        feature: "clothes",
        label: "Beskap",
        referenceId: "beskap-jawa-groom",
        options: { garmentCategory: "full_body" },
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

