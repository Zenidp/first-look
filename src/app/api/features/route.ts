import { NextResponse } from "next/server";

import { FEATURES, FEATURE_IDS, GARMENT_CATEGORIES, HAIR_COLOR_PRESETS, STYLE_HINTS } from "@/lib/perfectcorp/features";
import { forceLive, offline } from "@/lib/perfectcorp/fixtures";
import { supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/features — the whole registry, with costs. Free, no upstream call.
 * Doubles as living documentation of what this app can actually drive.
 */
export function GET() {
  return NextResponse.json({
    count: FEATURE_IDS.length,
    mode: offline() ? "offline" : forceLive() ? "force-live" : "cache-first",
    // Whether results can be cached anywhere but this machine's disk. False in
    // production means every look is billed again on every visit, so it is
    // worth being able to see at a glance.
    sharedCache: supabaseEnabled(),
    features: FEATURE_IDS.map((id) => ({
      id,
      ...FEATURES[id],
      endpoint: `/s2s/${FEATURES[id].version}/task/${FEATURES[id].task}`,
      hasTemplates: Boolean(FEATURES[id].templates),
    })),
    enums: {
      hairColorPresets: HAIR_COLOR_PRESETS,
      garmentCategories: GARMENT_CATEGORIES,
      styleHints: STYLE_HINTS,
    },
  });
}
