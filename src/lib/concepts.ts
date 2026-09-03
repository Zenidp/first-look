import type { FeatureId } from "./perfectcorp/features";

/**
 * Prewedding concept previews.
 *
 * Built on a behaviour that is documented nowhere upstream and was found by
 * testing (docs/FINDINGS.md §1): the `styled` fashion endpoints — scarf, hat,
 * shoes, bag — do NOT dress the uploaded photo. They synthesise an entire new
 * photograph: location, wardrobe, lighting, season, pose.
 *
 * That makes them useless for the look board, which promises the bride her own
 * face. It makes them well suited to a different question that Indonesian
 * couples also answer blind and expensively: what should the prewedding shoot
 * look like?
 *
 * Two measurements drive the design:
 *
 *  1. `ref_file_id` is required at runtime even though the OpenAPI schema does
 *     not mark it required — omitting it returns 400 InvalidParameters.
 *  2. The reference is nearly inert. A plain ivory swatch produced a lakeside
 *     golden-hour scene under `style_bohemian` and a blossom-lined café street
 *     under `style_french_elegance`. The `style` hint is what actually steers
 *     the image.
 *
 * So every concept ships a self-made neutral swatch (public/concept-neutral.jpg)
 * purely to satisfy the required field, and the concept identity lives entirely
 * in the style hint. No third-party imagery is involved, which keeps this clear
 * of the licensing problem in FINDINGS §7.
 *
 * These are AI-generated concepts, never the couple's photograph. The UI must
 * say so on every single frame.
 */

export type Concept = {
  id: string;
  /** Indonesian label — this surface is for the couple, not the developer. */
  label: string;
  blurb: string;
  feature: Extract<FeatureId, "scarf" | "hat" | "shoes" | "bag">;
  /** The style hint. This is the real lever. */
  style: string;
  /** True where the output has actually been generated and inspected. */
  verified: boolean;
};

export const CONCEPT_SWATCH = "concept-neutral.jpg";

export const CONCEPTS: Concept[] = [
  {
    id: "danau-senja",
    label: "Lakeside dusk",
    blurb: "Water's edge at golden hour, a flowing gown, a quiet natural mood.",
    feature: "scarf",
    style: "style_bohemian",
    verified: true,
  },
  {
    id: "kota-klasik",
    label: "Classic city",
    blurb: "A city street in bloom, a café table, the clean line of a long coat.",
    feature: "scarf",
    style: "style_french_elegance",
    verified: true,
  },
  {
    id: "mewah-lembut",
    label: "Quiet luxury",
    blurb: "An expensive neutral palette, soft light, a calm editorial feel.",
    feature: "scarf",
    style: "style_light_luxury",
    verified: false,
  },
  {
    id: "pedesaan",
    label: "Countryside",
    blurb: "Rural surroundings, wildflowers, gentle midday light.",
    feature: "scarf",
    style: "style_cottagecore",
    verified: false,
  },
  {
    id: "urban-modern",
    label: "Urban modern",
    blurb: "Clean lines, decisive colour, a contemporary city backdrop.",
    feature: "scarf",
    style: "style_modern_chic",
    verified: false,
  },
  {
    id: "pantai-tropis",
    label: "Tropical shore",
    blurb: "A coastal holiday mood — the closest thing to a Bali prewedding shoot.",
    feature: "hat",
    style: "style_vacation_casual",
    verified: true,
  },
  {
    id: "sore-hangat",
    label: "Warm afternoon",
    blurb: "Warm light, comfortable layers, an intimate mood.",
    feature: "hat",
    style: "style_warm_cozy",
    verified: false,
  },
  {
    id: "retro",
    label: "Retro",
    blurb: "Period styling, a nostalgic palette, the look of analogue film.",
    feature: "shoes",
    style: "style_retro_fashion",
    verified: false,
  },
];

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}

/** Every concept costs the same: 2 units for the underlying styled task. */
export const UNITS_PER_CONCEPT = 2;
