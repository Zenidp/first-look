/**
 * Turns engine errors into something a bride can act on.
 *
 * The platform's failure messages are written for the integrator, not the user:
 * "error_src_face_too_small", "Wrist size should fit in range", "earlobe
 * alignment not confident". Shown raw they read as a broken app rather than a
 * photo that needs retaking — and since most of these are billed (FINDINGS §3),
 * a user who does not understand what went wrong will simply pay to fail again.
 *
 * The vocabulary here was collected by hitting the failures, not by reading the
 * docs: FINDINGS §2, §2c and §8b.
 */

type Rule = { match: RegExp; message: string };

/** `src` faults are her photo; `ref` faults are the product or style image. */
const RULES: Rule[] = [
  // --- the source photo ------------------------------------------------------
  {
    match: /error_src_face_too_small|face.*too small/i,
    message:
      "The face is too small in this photo. Use the guided crop and fit the face to the " +
      "oval, or take the picture from closer in.",
  },
  {
    match: /error_src_no_face|no.*face.*detect/i,
    message: "No face was detected. Make sure the face is toward the camera and unobstructed.",
  },
  {
    match: /error_src_large_face_angle|error_face_angle_invalid|face.*angle/i,
    message:
      "The face is turned too far. This needs a photo looking straight at the camera, head upright and untilted.",
  },
  {
    match: /error_src_eye_closed/i,
    message: "The eyes are closed in this photo. Choose one with both eyes clearly open.",
  },
  {
    match: /error_src_eye_occluded|error_src_lip_occluded/i,
    message:
      "Something is covering the eyes or lips — hair, a hand, or glasses. " +
      "Use a photo with the face clear.",
  },

  // --- specific features -----------------------------------------------------
  {
    match: /earlobe alignment/i,
    message:
      "The ears are covered by hair, so the earrings cannot be placed. " +
      "Choose an updo, or skip the earrings.",
  },
  {
    match: /error_no_teeth/i,
    message: "No teeth are visible. Whitening needs a photo with an open smile.",
  },
  {
    match: /error_nail_too_small/i,
    message: "The nails are too small in frame. This needs a macro shot dominated by the hand.",
  },
  {
    match: /hand pose/i,
    message:
      "The hand pose is off. One hand only, upright, back of the hand toward the camera, " +
      "with the wrist in frame.",
  },
  {
    match: /wrist/i,
    message:
      "The wrist position is off. Hold the arm vertical with the wrist facing the camera, " +
      "not side-on.",
  },

  // --- the reference image ---------------------------------------------------
  {
    match: /error_ref_face_too_small|error_inappropriate_ref/i,
    message:
      "The reference photo does not qualify — usually too small, turned away, or with the " +
      "face covered by hair. Use a large, front-facing reference.",
  },
  { match: /error_ref_no_face/i, message: "There is no face in the reference photo." },

  // --- request-level, and free -----------------------------------------------
  {
    match: /InvalidTemplate/i,
    message: "That option is no longer in the catalogue. Choose another.",
  },
  {
    match: /OfflineCacheMiss/i,
    message:
      "Saver mode is on: this combination is not cached, so it was not run. " +
      "Nothing was spent.",
  },
  {
    match: /PollTimeout/i,
    message: "It took too long and was stopped. Try again shortly.",
  },
  {
    match: /MissingApiKey/i,
    message: "The server is not fully configured. Contact whoever runs the app.",
  },
  {
    match: /rate limit|429/i,
    message: "Too many requests at once. Wait a moment and try again.",
  },
];

/**
 * `code` and `message` both come from the API response. Either can carry the
 * useful part — engine errors put it in `error_message` while validation
 * failures put it in `error_code` — so both are searched.
 */
export function explain(code?: string, message?: string): string {
  const haystack = `${code ?? ""} ${message ?? ""}`;
  const hit = RULES.find((r) => r.match.test(haystack));
  if (hit) return hit.message;

  // Nothing matched. Say so plainly and keep the original, rather than invent a
  // reason — an unrecognised failure is exactly when the raw text is worth most.
  return message?.trim()
    ? `This step failed: ${message.trim()}`
    : "This step failed for a reason we do not recognise.";
}

/**
 * Whether the failure happened before the task was created — the only case that
 * is certainly free. Everything else must be assumed billed (FINDINGS §3).
 */
export function wasFree(code?: string): boolean {
  return /OfflineCacheMiss|InvalidPayload|Missing|Bad|Unknown|Wrong|InvalidTemplate|InvalidParameters/i.test(
    code ?? "",
  );
}
