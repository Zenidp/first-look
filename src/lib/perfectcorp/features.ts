/**
 * Complete registry of the Perfect Corp / YouCam APIs this app can drive.
 *
 * Every version here was verified on 31 Aug 2026 by enumerating the raw
 * OpenAPI bundles at docs.perfectcorp.com/_bundle/reference/<api>.json and
 * reading the `tags` on each POST operation. Only two features ship more than
 * one version, and both are pinned to the newest:
 *
 *   Hair Style   v1.0 hair-style -> v2.0 hair-transfer -> V2.1 hair-transfer *
 *   Clothes      V2.0 cloth      -> V3.0 cloth-v3      -> V4.0 cloth-v4      *
 *
 * Everything else exposes exactly one version.
 *
 * `units` comes from each spec's own "Unit Consumption" table. Uploading
 * files, listing templates and polling are all free; only task creation bills.
 */

// --- request families -------------------------------------------------------
//
// The endpoints do NOT share one request shape. They fall into seven, and the
// payload builder in client.ts switches on `kind`.
//
//  template  src + template_id
//  reference src + ref_file_id
//  hybrid    src + (template_id | ref_file_id), plus extras   [hair style v2.1]
//  garment   src + ref_file_id + garment_category             [clothes]
//  styled    src + ref_file_id + gender (required) + style    [fashion suite]
//  jewelry   src + ref_file_ids + source_info + object_infos  [2d-vto suite]
//  preset    src + preset (no reference image at all)         [hair colour]
//  effects   src + caller-supplied effects/effect payload     [makeup, nails…]
//  detect    src only; returns JSON attributes, not an image  [diagnostics]
//  video     src + resolution + dst_duration + prompt         [image-to-video]
//
// !! BEHAVIOURAL WARNING, measured 31 Aug 2026, documented nowhere upstream:
// the `styled` family (scarf, hat, shoes, bag) does NOT composite onto the
// uploaded photo. It GENERATES a new full-body lifestyle scene — new outfit,
// new background, new crop — keeping only an approximation of the face. A
// scarf try-on came back as a woman in a red coat on an autumn cobbled street.
// Every other family verified here (hybrid, template, reference, garment,
// jewelry, preset) edits her real photo and preserves the frame exactly.
// Do not put `styled` output on the look board; it breaks the whole premise of
// "her own face". Use it, if at all, as a separate inspiration surface.

export type RequestKind =
  | "template"
  | "reference"
  | "hybrid"
  | "garment"
  | "styled"
  | "jewelry"
  | "preset"
  | "effects"
  | "detect"
  | "video";

export type Feature = {
  label: string;
  group: "Hair" | "Makeup" | "Jewellery" | "Fashion" | "Diagnostics" | "Video";
  kind: RequestKind;
  /** Path after /s2s/<version>/task/ */
  task: string;
  version: string;
  units: number;
  /** Template listing endpoint, when the feature has one. */
  templates?: { path: string; version: string };
  /** Number of source photos required. Two diagnostics need front/right/left. */
  sourcePhotos?: 1 | 3;
  /** Result is JSON attributes rather than an image. */
  returnsJson?: boolean;
  /** Result is an mp4 rather than a jpg. Changes what the fixture cache writes. */
  returnsVideo?: boolean;
  /**
   * Poll budget, when the default 90s is not enough. Video generation is an
   * order of magnitude slower than every compositing call on the platform.
   */
  pollTimeoutMs?: number;
  /** True when the endpoint invents a new scene instead of editing her photo. */
  generative?: boolean;
  /** Short note surfaced in the UI and in the API index. */
  note?: string;
};

// `as const satisfies` below pins the key names so FeatureId is a literal
// union, but it also narrows each value to its own literal type, which would
// hide optional fields like `templates`. FEATURES re-exports the same object
// under the uniform Feature type so callers see every field.
const FEATURE_TABLE = {
  // ======================= HAIR ============================================
  hairStyle: {
    label: "Hair Style Try-On",
    group: "Hair",
    kind: "hybrid",
    task: "hair-transfer",
    version: "v2.1",
    units: 2,
    templates: { path: "template/hair-transfer", version: "v2.1" },
    note: "Newest version. Takes a template or any reference photo. hair_color:'src' keeps her own colour on templates flagged keep_users_color.",
  },
  hairColor: {
    label: "Hair Colour",
    group: "Hair",
    kind: "preset",
    task: "hair-color",
    version: "v2.0",
    units: 1,
    note: "No reference image needed — 20 built-in presets, including ombre pairs.",
  },
  hairBangs: {
    label: "Bangs",
    group: "Hair",
    kind: "template",
    task: "hair-bang",
    version: "v2.0",
    units: 1,
    templates: { path: "template/hair-bang", version: "v2.0" },
  },
  hairExtension: {
    label: "Hair Extension",
    group: "Hair",
    kind: "template",
    task: "hair-ext",
    version: "v2.0",
    units: 1,
    templates: { path: "template/hair-ext", version: "v2.0" },
    note: "3 templates: Length 1-3. Useful for showing what extensions would buy her.",
  },
  hairVolume: {
    label: "Hair Volume",
    group: "Hair",
    kind: "template",
    task: "hair-vol",
    version: "v2.0",
    units: 2,
    templates: { path: "template/hair-vol", version: "v2.0" },
    note: "5 levels: Subtle -> Maximized. Pairs with density diagnostics.",
  },
  wavyHair: {
    label: "Wavy Hair",
    group: "Hair",
    kind: "template",
    task: "hair-curl",
    version: "v2.0",
    units: 1,
    templates: { path: "template/hair-curl", version: "v2.0" },
  },
  beardStyle: {
    label: "Beard Style",
    group: "Hair",
    kind: "template",
    task: "beard-style",
    version: "v2.0",
    units: 1,
    templates: { path: "template/beard-style", version: "v2.0" },
    note: "For the groom. 15 styles.",
  },

  // ======================= MAKEUP ==========================================
  makeupLook: {
    label: "Full Look",
    group: "Makeup",
    kind: "template",
    task: "look-vto",
    version: "v2.0",
    units: 2,
    templates: { path: "template/look-vto", version: "v2.0" },
    note: "349 curated looks. Only 3 sit in the Wedding category; Makeup Artist (27) and Red Carpet (4) are the other bridal-usable sets.",
  },
  makeupTransfer: {
    label: "Makeup Transfer",
    group: "Makeup",
    kind: "reference",
    task: "mu-transfer",
    version: "v2.0",
    units: 2,
    note: "Copies makeup off any reference photo. This is the answer to the Pinterest-screenshot problem.",
  },
  makeupCustom: {
    label: "Custom Makeup",
    group: "Makeup",
    kind: "effects",
    task: "makeup-vto",
    version: "v2.0",
    units: 1,
    note: "Per-category control over 13 categories. Needs an `effects` array; pattern labels come from the catalogues in public/patterns/.",
  },
  eyeColor: {
    label: "Eye Colour Lens",
    group: "Makeup",
    kind: "effects",
    task: "eye-color-vto",
    version: "v2.0",
    units: 1,
    note: "Requires `effect` object plus version '1.0'.",
  },
  teethWhitening: {
    label: "Teeth Whitening",
    group: "Makeup",
    kind: "effects",
    task: "teeth-whiten",
    version: "v2.0",
    units: 1,
    note: "Two-step: POST teeth-whiten/pre-process first, then teeth-whiten with effect + index.",
  },
  nailColor: {
    label: "Nail Try-On",
    group: "Makeup",
    kind: "effects",
    task: "nail-vto",
    version: "v2.0",
    units: 1,
    note: "Requires effect_type ('nail_polish' | 'press_on_nails'), effects array and version.",
  },
  nailTransfer: {
    label: "Nail Transfer",
    group: "Makeup",
    kind: "reference",
    task: "ai-nail",
    version: "v2.0",
    units: 1,
    note: "Copies a nail design off a reference photo — the simple path for bridal nails.",
  },

  // ======================= JEWELLERY =======================================
  // All 2D VTO endpoints need BOTH the flat file ids AND the nested
  // source_info / object_infos objects that point back at those same ids.
  earrings: {
    label: "Earrings",
    group: "Jewellery",
    kind: "jewelry",
    task: "2d-vto/earring",
    version: "v2.0",
    units: 1,
    note: "1 unit single, 2 stacked. Background removal on the product shot is automatic.",
  },
  necklace: {
    label: "Necklace",
    group: "Jewellery",
    kind: "jewelry",
    task: "2d-vto/necklace",
    version: "v2.0",
    units: 1,
  },
  ring: {
    label: "Ring",
    group: "Jewellery",
    kind: "jewelry",
    task: "2d-vto/ring",
    version: "v2.0",
    units: 1,
    note: "Has its own upload endpoint, /s2s/v2.0/file/2d-vto/ring, separate from the generic File API.",
  },
  bracelet: {
    label: "Bracelet",
    group: "Jewellery",
    kind: "jewelry",
    task: "2d-vto/bracelet",
    version: "v2.0",
    units: 1,
  },
  watch: {
    label: "Watch",
    group: "Jewellery",
    kind: "jewelry",
    task: "2d-vto/watch",
    version: "v2.0",
    units: 1,
    note: "Registered for completeness; marginal for bridal.",
  },

  // ======================= FASHION =========================================
  clothes: {
    label: "Outfit (newest engine)",
    group: "Fashion",
    kind: "garment",
    task: "cloth-v4",
    version: "v2.0",
    units: 2,
    note: "V4.0, the newest. Reference photo only — V4 dropped template_id. Use garment_category 'full_body' for a kebaya or gown.",
  },
  clothesTemplates: {
    label: "Outfit (template catalogue)",
    group: "Fashion",
    kind: "template",
    task: "cloth",
    version: "v2.0",
    units: 2,
    templates: { path: "template/cloth", version: "v2.0" },
    note: "Older V2.0 engine, kept ONLY because it is the one version that accepts template_id. 250 outfits, 4 in Wedding, 16 in Cultural Attire — no kebaya, so Indonesian looks need a custom reference through `clothes`.",
  },
  scarf: {
    label: "Scarf / Hijab",
    group: "Fashion",
    kind: "styled",
    task: "scarf",
    version: "v2.0",
    units: 2,
    generative: true,
    note: "GENERATIVE, not a composite — returns a whole new scene, not her photo. Verified 31 Aug 2026. `gender` required.",
  },
  fabric: {
    label: "Fabric Swap",
    group: "Fashion",
    kind: "template",
    task: "fabric",
    version: "v2.0",
    units: 2,
    templates: { path: "template/fabric", version: "v2.0" },
    note: "Re-textures an outfit. Closest lever for songket / batik / tenun exploration.",
  },
  shoes: {
    label: "Shoes",
    group: "Fashion",
    kind: "styled",
    task: "shoes",
    version: "v2.0",
    units: 2,
    generative: true,
    note: "GENERATIVE — new scene, not her photo. `gender` required.",
  },
  bag: {
    label: "Bag",
    group: "Fashion",
    kind: "styled",
    task: "bag",
    version: "v2.0",
    units: 2,
    generative: true,
    note: "GENERATIVE — new scene, not her photo. `gender` required.",
  },
  hat: {
    label: "Hat / Headpiece",
    group: "Fashion",
    kind: "styled",
    task: "hat",
    version: "v2.0",
    units: 2,
    generative: true,
    note: "GENERATIVE — new scene, not her photo. `gender` required.",
  },

  // ======================= VIDEO ===========================================
  // Verified 1 Sep 2026 against docs.perfectcorp.com/_bundle/reference/
  // ai_video_generator.json. Two engines exist and they are NOT the same deal:
  //
  //   V1.0  POST /s2s/v2.0/task/image-to-video          template_id + dst_duration
  //         Catalogue of ~950 templates, listed free. Every one of them is a
  //         novelty: Puppy Love, Jump for Joy, Superhero, Slow Waltz — the
  //         categories are Animal, Portrait, Transform and Dance. Nothing
  //         bridal. And it bills 3 units PER SECOND (std) or 6 (pro), so the
  //         shortest clip is 15 units.
  //
  //   V2.0  POST /s2s/v2.0/task/image-to-video/youcam   free-form `prompt`
  //         1/2/3 units per second at 480/720/1080. A 5s 480p clip is 5 units,
  //         three times cheaper than V1, and the prompt can actually describe a
  //         bride rather than picking the least wrong novelty template.
  //
  // V2 is registered; V1 is deliberately not. See docs/FINDINGS.md section 9.
  imageToVideo: {
    label: "Look → Video",
    group: "Video",
    kind: "video",
    task: "image-to-video/youcam",
    version: "v2.0",
    // Billing is per second and per resolution tier, so this is only the cost
    // of the default (480p, 5s). videoUnits() computes the real figure.
    units: 5,
    returnsVideo: true,
    // Generative video is far slower than the 12.8s scarf, itself the slowest
    // compositing call measured. 90s would time out on a task that is fine.
    pollTimeoutMs: 300_000,
    note: "V2.0 engine. Animates the finished look board photo. Input needs an aspect ratio between 1:2.5 and 2.5:1 and a long side under 4096px — every fixture in this project is 747x1024, so it qualifies.",
  },

  // ======================= DIAGNOSTICS (Hair Readiness) ====================
  hairTypeDetection: {
    label: "Hair Type",
    group: "Diagnostics",
    kind: "detect",
    task: "hair-type-detection",
    version: "v2.0",
    units: 2,
    sourcePhotos: 3,
    returnsJson: true,
    note: "Needs exactly 3 photos in order: front, right, left. Returns a 1-4c curl-type band.",
  },
  hairLengthDetection: {
    label: "Hair Length",
    group: "Diagnostics",
    kind: "detect",
    task: "hair-length-detection",
    version: "v2.0",
    units: 2,
    sourcePhotos: 1,
    returnsJson: true,
    note: "Single photo. Returns a band from 'above the ears' to 'long hair' — the key input for the wedding-date timeline.",
  },
  hairDensityDetection: {
    label: "Hair Density",
    group: "Diagnostics",
    kind: "detect",
    task: "hair-density-detection",
    version: "v2.0",
    units: 1,
    sourcePhotos: 1,
    returnsJson: true,
    note: "Returns a 0-3 score plus a term from Extremely Low to High Density.",
  },
  hairFrizzinessDetection: {
    label: "Hair Frizziness",
    group: "Diagnostics",
    kind: "detect",
    task: "hair-frizziness-detection",
    version: "v2.0",
    units: 2,
    sourcePhotos: 3,
    returnsJson: true,
    note: "Needs 3 photos. Returns Not Frizzy / Slightly Frizzy / Frizzy / Extreme Frizzy.",
  },
} as const satisfies Record<string, Feature>;

export type FeatureId = keyof typeof FEATURE_TABLE;

export const FEATURES: Record<FeatureId, Feature> = FEATURE_TABLE;

export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export function isFeatureId(v: string): v is FeatureId {
  return Object.prototype.hasOwnProperty.call(FEATURES, v);
}

export function getFeature(id: FeatureId): Feature {
  return FEATURES[id];
}

/** 20 built-in hair colours, straight from the endpoint's own enum. */
export const HAIR_COLOR_PRESETS = [
  "Jet Black", "Chocolate Brown", "Honey Blonde", "Platinum Blonde", "Ash Gray",
  "Rose Gold", "Burgundy", "Copper Red", "Lavender", "Teal Blue",
  "Dark Brown/Caramel Blonde", "Jet Black/Silver Gray", "Ash Brown/Lavender",
  "Rose Gold/Peach Blonde", "Burgundy/Magenta Pink", "Deep Blue/Teal Green",
  "Plum Purple/Pastel Lilac", "Copper Red/Golden Blonde", "Dark Gray/Ice Blonde",
  "Midnight Blue/Denim Blue",
] as const;

export const GARMENT_CATEGORIES = [
  "full_body", "upper_body", "lower_body", "outer", "shoes", "auto",
] as const;

/** Optional style hints on the fashion suite. Values differ per endpoint. */
export const STYLE_HINTS: Partial<Record<FeatureId, readonly string[]>> = {
  scarf: ["random", "style_french_elegance", "style_light_luxury", "style_cottagecore", "style_modern_chic", "style_bohemian"],
  shoes: ["random", "style_minimalist", "style_bohemian", "style_cottagecore", "style_french_elegance", "style_retro_fashion"],
  hat: ["random", "style_sporty_casual", "style_urban_fashion", "style_vacation_casual", "style_warm_cozy", "style_bohemian"],
};

// --- video ------------------------------------------------------------------

export const VIDEO_RESOLUTIONS = ["480", "720", "1080"] as const;
export const VIDEO_DURATIONS = [5, 10] as const;

export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

/** Units per second of output, by resolution tier. From the spec's own table. */
const VIDEO_UNITS_PER_SECOND: Record<VideoResolution, number> = {
  "480": 1,
  "720": 2,
  "1080": 3,
};

/**
 * Video is the only feature on the platform that does not bill a flat rate:
 * the cost is (units per second for the tier) x duration. 480p/5s is 5 units,
 * 1080p/10s is 30 — a 6x spread, so the caller must not be allowed to pick
 * blind. Everything else in FEATURES has a fixed `units` and means it.
 */
export function videoUnits(resolution: VideoResolution, duration: VideoDuration): number {
  return VIDEO_UNITS_PER_SECOND[resolution] * duration;
}

/** Makeup pattern catalogues mirrored into public/patterns/ (4,458 patterns). */
export const PATTERN_CATALOGUES = [
  "blush", "bronzer", "contour", "eyebrows", "eyelashes",
  "eyeliner", "eyeshadow", "highlighter", "lipliner", "lipshape",
] as const;
