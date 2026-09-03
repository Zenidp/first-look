/**
 * Nusantara reference library.
 *
 * Perfect Corp's own catalogues carry no kebaya, no hijab, and nothing
 * Indonesian at all — 3 wedding looks and 4 wedding gowns, all Western. See
 * docs/FINDINGS.md §6. The custom-reference path is verified working for both
 * garments (cloth-v4) and makeup, so the localisation lives here instead.
 *
 * Indonesia is not one bridal aesthetic. Paes Ageng and Sundanese siger and
 * Minang suntiang are different silhouettes, different headpieces and
 * different makeup, and an MUA in Yogyakarta is not serving the same look as
 * one in Padang. The library is therefore indexed by region first.
 *
 * IMAGES ARE NOT INCLUDED. Every entry below is a declared slot with no file
 * behind it yet, and `getAvailableReferences()` hides any slot whose image is
 * missing, so nothing broken can reach the UI. Drop a file into
 * public/references/<id>.jpg and fill in `credit` + `license` to turn a slot on.
 *
 * The credit/license fields are required by the type on purpose. Perfect
 * Corp's terms forbid shipping their assets (FINDINGS.md §7), and a bridal
 * reference library is exactly the place where someone else's photograph would
 * otherwise get quietly committed.
 */

export type Region =
  | "Jawa"
  | "Sunda"
  | "Minang"
  | "Bali"
  | "Bugis"
  | "Batak"
  | "Betawi"
  | "Aceh"
  | "Nasional";

/** Which registry feature this reference can be fed to. */
export type ReferenceUse =
  | "clothes"
  | "makeupTransfer"
  | "hairStyle"
  | "earrings"
  | "necklace"
  | "ring"
  | "bracelet"
  | "eyeColor";

export type ReferenceItem = {
  id: string;
  label: string;
  region: Region;
  use: ReferenceUse;
  /** Muslim bridal styling — lets the UI offer a covered-hair filter. */
  hijab?: boolean;
  /**
   * Worn by the groom. The try-on endpoint neither knows nor cares, but the
   * look builder does: offering a bride a beskap is as wrong as offering a
   * groom a kebaya, and the slot filters on this.
   */
  groom?: boolean;
  /** Who made the image. Required: no uncredited photo ships. */
  credit: string;
  /** Licence or written permission. Required for the same reason. */
  license: string;
  /**
   * Placement parameters for the 2D VTO suite, merged into `object_infos[0]`.
   * Without them the engine guesses and a bangle lands flat on the forearm.
   * `bracelet_anchor_point` is the pair of FARTHEST points on the product's
   * inner edge — measured, not eyeballed; see scripts/measure-anchor.py.
   */
  parameter?: Record<string, unknown>;
  notes?: string;
};

/**
 * The slots. Labels and regions are researched product intent; the images are
 * yours to supply. Filenames are always public/references/<id>.jpg.
 */
export const REFERENCE_LIBRARY: ReferenceItem[] = [
  // ---- Busana: kebaya & traditional ---------------------------------------
  {
    id: "kebaya-jawa-klasik",
    label: "Classic Javanese kebaya",
    region: "Jawa",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Long-sleeved lace kebaya over batik. Shoot flat or on a model, full body.",
  },
  {
    id: "kebaya-sunda-siger",
    label: "Sundanese kebaya",
    region: "Sunda",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "baju-kurung-minang",
    label: "Minang baju kurung",
    region: "Minang",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Songket-heavy. Pairs with the suntiang headpiece reference.",
  },
  {
    id: "payas-agung-bali",
    label: "Balinese payas agung",
    region: "Bali",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "baju-bodo-bugis",
    label: "Bugis baju bodo",
    region: "Bugis",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "ulos-batak",
    label: "Batak ulos",
    region: "Batak",
    use: "clothes",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },

  // ---- Busana: hijab -------------------------------------------------------
  // The scarf endpoint cannot do this: it generates a new scene rather than
  // dressing her photo (FINDINGS.md §1). Hijab bridal looks go through
  // `clothes` (cloth-v4) as a full-body garment reference instead.
  {
    id: "kebaya-hijab-modern",
    label: "Modern hijab kebaya",
    region: "Nasional",
    use: "clothes",
    hijab: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Route through `clothes`, never `scarf`.",
  },
  {
    id: "gaun-syari-aceh",
    label: "Acehnese gaun syar'i",
    region: "Aceh",
    use: "clothes",
    hijab: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },

  // ---- Busana pengantin pria -----------------------------------------------
  // A wedding has two people in it. These route through `clothes` (cloth-v4)
  // exactly like the bride's garments — the endpoint has no notion of who is
  // wearing what, it dresses whatever body is in the frame.
  //
  // Each is specified as a CLOSED outfit for the same measured reason as the
  // kebaya: cloth-v4 reads an open flat-lay literally and returns an open
  // jacket over a bare chest.
  {
    id: "beskap-jawa-groom",
    label: "Javanese beskap",
    region: "Jawa",
    use: "clothes",
    groom: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 3 Sep 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Pairs with kebaya-jawa-klasik — same sogan parang batik.",
  },
  {
    id: "beskap-sunda-groom",
    label: "Sundanese beskap",
    region: "Sunda",
    use: "clothes",
    groom: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 3 Sep 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "baju-minang-groom",
    label: "Minang groom's dress",
    region: "Minang",
    use: "clothes",
    groom: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 3 Sep 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "jas-pengantin-modern",
    label: "Modern wedding suit",
    region: "Nasional",
    use: "clothes",
    groom: true,
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 3 Sep 2026",
    license: "AI-generated for this project; no third-party rights",
  },

  // ---- Makeup daerah -------------------------------------------------------
  // Fed to makeupTransfer, the strictest endpoint on the platform. Every image
  // here must be a high-resolution frontal portrait with the face filling most
  // of a 1024px frame and clear skin beside the eyes, or it is rejected —
  // see FINDINGS.md §2 before shooting these.
  {
    id: "paes-ageng-jogja",
    label: "Paes ageng, Yogyakarta",
    region: "Jawa",
    use: "makeupTransfer",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Frontal, high-res, hair fully off the eye area or the API rejects it.",
  },
  {
    id: "makeup-sunda-siger",
    label: "Sundanese bridal makeup",
    region: "Sunda",
    use: "makeupTransfer",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "makeup-minang-suntiang",
    label: "Minang suntiang makeup",
    region: "Minang",
    use: "makeupTransfer",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "makeup-bali-payas",
    label: "Balinese payas agung makeup",
    region: "Bali",
    use: "makeupTransfer",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "makeup-betawi-none",
    label: "Betawi bridal makeup",
    region: "Betawi",
    use: "makeupTransfer",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  // ---- Product shots for the 2D VTO suite and the lens effect --------------
  // Not regional: these are generic bridal pieces used to prove the endpoints.
  {
    id: "earring-gold-drop",
    label: "Gold drop earrings",
    region: "Nasional",
    use: "earrings",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "necklace-gold-collar",
    label: "Gold collar necklace",
    region: "Nasional",
    use: "necklace",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
  {
    id: "ring-gold-solitaire",
    label: "Gold solitaire ring",
    region: "Nasional",
    use: "ring",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    notes: "Needs a single-hand photo with the wrist in frame — see input/hand-ring.jpg.",
  },
  {
    id: "bracelet-gold-cuff",
    label: "Gold bracelet",
    region: "Nasional",
    use: "bracelet",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
    parameter: {
      bracelet_anchor_point: [[602, 272], [406, 738]],
      bracelet_wearing_location: 0,
      bracelet_shadow_intensity: 0.35,
    },
    notes: "Needs the wrist facing the camera, arm vertical — see input/hand-bracelet.jpg.",
  },
  {
    id: "lens-hazel",
    label: "Hazel contact lenses",
    region: "Nasional",
    use: "eyeColor",
    credit: "Generated with Gemini 2.5 Flash Image (Vertex AI), 31 Aug 2026",
    license: "AI-generated for this project; no third-party rights",
  },
];

export const REGIONS: Region[] = [
  "Nasional", "Jawa", "Sunda", "Minang", "Bali", "Bugis", "Batak", "Betawi", "Aceh",
];

/** A slot is live only once it has an image, a credit and a licence. */
export function isReady(item: ReferenceItem, availableIds: Set<string>): boolean {
  return availableIds.has(item.id) && item.credit.trim() !== "" && item.license.trim() !== "";
}

export function referencePath(id: string): string {
  return `/references/${id}.jpg`;
}
