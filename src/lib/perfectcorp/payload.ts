import {
  getFeature,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  type FeatureId,
} from "./features";

/**
 * Builds the request body for a task, given uploaded file ids.
 *
 * The endpoints look uniform from the outside — upload, create, poll — but
 * their bodies are not. Seven distinct shapes, verified field by field against
 * the OpenAPI bundles. Getting one wrong costs units, because a rejected task
 * can still bill.
 */

export type BuildInput = {
  /** File ids for the bride's photo(s). Diagnostics may need three. */
  srcFileIds: string[];
  /** File id for the style/product reference, when one was uploaded. */
  refFileId?: string;
  /** Free-form options from the caller: templateId, preset, gender, etc. */
  options: Record<string, unknown>;
};

export class PayloadError extends Error {
  constructor(message: string, readonly code = "InvalidPayload") {
    super(message);
    this.name = "PayloadError";
  }
}

function str(options: Record<string, unknown>, key: string): string | undefined {
  const v = options[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function buildPayload(feature: FeatureId, input: BuildInput): Record<string, unknown> {
  const f = getFeature(feature);
  const { srcFileIds, refFileId, options } = input;
  const src = srcFileIds[0];

  if (!src) throw new PayloadError("no source photo was uploaded", "MissingSource");

  const templateId = str(options, "templateId");

  switch (f.kind) {
    // src + template_id
    case "template": {
      if (!templateId) throw new PayloadError(`${f.label} requires a templateId`, "MissingTemplate");
      const body: Record<string, unknown> = { src_file_id: src, template_id: templateId };
      // The V2.0 clothes engine is the only template-driven one taking extras.
      if (feature === "clothesTemplates") {
        body.garment_category = str(options, "garmentCategory") ?? "full_body";
        if (options.changeShoes === true) body.change_shoes = true;
      }
      return body;
    }

    // src + ref_file_id
    case "reference": {
      if (!refFileId) throw new PayloadError(`${f.label} requires a reference photo`, "MissingReference");
      return { src_file_id: src, ref_file_id: refFileId };
    }

    // src + (template_id XOR ref_file_id) + hair_color
    case "hybrid": {
      if (!templateId && !refFileId) {
        throw new PayloadError("provide a templateId or a reference photo", "MissingStyle");
      }
      if (templateId && refFileId) {
        throw new PayloadError("provide a templateId or a reference photo, not both", "AmbiguousStyle");
      }
      const body: Record<string, unknown> = { src_file_id: src };
      if (templateId) {
        body.template_id = templateId;
        const hc = str(options, "hairColor");
        // Only meaningful on templates whose keep_users_color is true.
        if (hc === "src" || hc === "ref") body.hair_color = hc;
      } else {
        body.ref_file_id = refFileId;
      }
      return body;
    }

    // src + ref_file_id + garment_category  (cloth-v4 has no template support)
    case "garment": {
      if (!refFileId) {
        throw new PayloadError(
          "the V4 outfit engine takes a reference photo only. For catalogue outfits use the clothesTemplates feature.",
          "MissingReference",
        );
      }
      const body: Record<string, unknown> = {
        src_file_id: src,
        ref_file_id: refFileId,
        garment_category: str(options, "garmentCategory") ?? "full_body",
      };
      if (options.changeShoes === true) body.change_shoes = true;
      return body;
    }

    // src + gender (the only REQUIRED field) + optional ref and/or style.
    // The OpenAPI schema marks only `gender` as required, so a scene can be
    // driven by the `style` hint alone with no product photo at all — which is
    // what the prewedding concept generator relies on.
    case "styled": {
      const gender = str(options, "gender");
      if (gender !== "female" && gender !== "male") {
        throw new PayloadError(`${f.label} requires gender to be "female" or "male"`, "MissingGender");
      }
      const style = str(options, "style");
      if (!refFileId && !style) {
        throw new PayloadError(
          `${f.label} needs a product photo or a style hint to work from`,
          "MissingStyleOrReference",
        );
      }
      const body: Record<string, unknown> = { src_file_id: src, gender };
      if (refFileId) body.ref_file_id = refFileId;
      if (style) body.style = style;
      return body;
    }

    // The 2D VTO suite wants the flat ids AND nested descriptors naming them.
    //
    // `parameter` is where placement actually lives, and leaving it out is why a
    // bracelet lands flat and low on the forearm: the engine falls back to a
    // guess. Each feature names its own keys, e.g.
    //   bracelet_anchor_point      the 2 farthest points on the bracelet's INNER edge
    //   bracelet_wearing_location  -0.3..1.0, 0 = at the wrist joint
    //   earring_is_right_ear, earring_scale, ring_anchor_point, …
    // Passed straight through so the caller can tune without a code change.
    case "jewelry": {
      if (!refFileId) throw new PayloadError(`${f.label} requires a product photo`, "MissingReference");
      const object: Record<string, unknown> = { name: refFileId };
      const parameter = options.parameter;
      if (parameter && typeof parameter === "object" && !Array.isArray(parameter)) {
        object.parameter = parameter;
      }
      return {
        src_file_id: src,
        ref_file_ids: [refFileId],
        source_info: { name: src },
        object_infos: [object],
      };
    }

    // src + preset, no reference image at all
    case "preset": {
      const preset = str(options, "preset");
      if (!preset) throw new PayloadError(`${f.label} requires a preset`, "MissingPreset");
      return { src_file_id: src, preset };
    }

    // Caller supplies the effect payload verbatim; shapes are per-endpoint.
    case "effects": {
      const effects = options.effects;
      const effect = options.effect;
      const body: Record<string, unknown> = { src_file_id: src };

      if (feature === "makeupCustom") {
        if (!Array.isArray(effects) || effects.length === 0) {
          throw new PayloadError("makeupCustom requires a non-empty effects array", "MissingEffects");
        }
        body.effects = effects;
        body.version = str(options, "version") ?? "1.0";
        return body;
      }
      if (feature === "nailColor") {
        if (!Array.isArray(effects) || effects.length === 0) {
          throw new PayloadError("nailColor requires a non-empty effects array", "MissingEffects");
        }
        const effectType = str(options, "effectType") ?? "nail_polish";
        if (refFileId) body.ref_file_ids = [refFileId];
        body.effect_type = effectType;
        body.effects = effects;
        body.version = str(options, "version") ?? "1.0";
        return body;
      }
      // eyeColor and teethWhitening both take a single `effect` object.
      if (!effect || typeof effect !== "object") {
        throw new PayloadError(`${f.label} requires an effect object`, "MissingEffect");
      }
      body.effect = effect;
      body.version = "1.0";
      if (feature === "teethWhitening" && typeof options.index === "number") {
        body.index = options.index;
      }
      if (feature === "eyeColor" && refFileId) body.ref_file_id = refFileId;
      return body;
    }

    // src + resolution + dst_duration, with an optional free-form prompt.
    //
    // Both `resolution` and `dst_duration` are required by the schema, and both
    // are closed enums — the engine will not clamp an out-of-range value, it
    // rejects the request. That rejection is at creation time (HTTP 400) so it
    // is free, but validating here keeps it free even if that ever changes.
    case "video": {
      const resolution = str(options, "resolution") ?? "480";
      if (!(VIDEO_RESOLUTIONS as readonly string[]).includes(resolution)) {
        throw new PayloadError(
          `resolution must be one of ${VIDEO_RESOLUTIONS.join(", ")}`,
          "BadResolution",
        );
      }
      const duration = options.duration ?? 5;
      if (!(VIDEO_DURATIONS as readonly number[]).includes(duration as number)) {
        throw new PayloadError("duration must be 5 or 10 seconds", "BadDuration");
      }
      const body: Record<string, unknown> = {
        src_file_id: src,
        model: "youcam-video-v2",
        resolution,
        dst_duration: duration,
      };
      // Capped at 1500 characters by the schema. Longer prompts are not
      // truncated upstream, they fail validation.
      const prompt = str(options, "prompt");
      if (prompt) {
        if (prompt.length > 1500) {
          throw new PayloadError("prompt is capped at 1500 characters", "PromptTooLong");
        }
        body.prompt = prompt;
      }
      const negative = str(options, "negativePrompt");
      if (negative) {
        if (negative.length > 1500) {
          throw new PayloadError("negativePrompt is capped at 1500 characters", "PromptTooLong");
        }
        body.negative_prompt = negative;
      }
      return body;
    }

    // Diagnostics. Two of the four want three photos as an array.
    case "detect": {
      if (f.sourcePhotos === 3) {
        if (srcFileIds.length !== 3) {
          throw new PayloadError(
            `${f.label} needs exactly 3 photos in order: front, right, left`,
            "NeedThreePhotos",
          );
        }
        return { src_file_ids: srcFileIds };
      }
      return { src_file_id: src };
    }
  }
}

/**
 * Cache identity for a task: everything that changes the output, minus the
 * file ids (which differ on every upload of the same bytes).
 */
export function cacheableOptions(
  feature: FeatureId,
  options: Record<string, unknown>,
): Record<string, unknown> {
  const keep = [
    "templateId", "preset", "gender", "style", "garmentCategory",
    "changeShoes", "hairColor", "effectType", "effects", "effect", "index",
    "parameter", "resolution", "duration", "prompt", "negativePrompt",
  ];
  const out: Record<string, unknown> = { __feature: feature };
  for (const k of keep) {
    if (options[k] !== undefined && options[k] !== "") out[k] = options[k];
  }
  return out;
}
