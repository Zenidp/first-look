import { NextResponse } from "next/server";

import { getFeature, isFeatureId } from "@/lib/perfectcorp/features";
import { listTemplates, PerfectCorpError } from "@/lib/perfectcorp/client";

export const runtime = "nodejs";

/**
 * GET /api/templates/<feature>?page_size=20&starting_token=...&all=1
 *
 * Costs 0 units. `all=1` walks the pagination and returns every template, which
 * is what the picker wants — the catalogues run to 349 looks and 250 outfits.
 * Capped at 30 pages so a runaway cursor cannot burn through the rate limit.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/templates/[feature]">) {
  const { feature } = await ctx.params;
  if (!isFeatureId(feature)) {
    return NextResponse.json({ error: `Unknown feature "${feature}"` }, { status: 404 });
  }

  const f = getFeature(feature);
  if (!f.templates) {
    return NextResponse.json(
      { error: `${f.label} has no template catalogue`, code: "NoTemplates" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const pageSize = Math.min(Number(searchParams.get("page_size") ?? 20) || 20, 20);
  const wantAll = searchParams.get("all") === "1";

  try {
    if (!wantAll) {
      const body = await listTemplates(
        feature,
        pageSize,
        searchParams.get("starting_token") ?? undefined,
      );
      return NextResponse.json(body.data, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }

    const templates: unknown[] = [];
    let token: string | undefined;
    for (let page = 0; page < 30; page++) {
      const body = await listTemplates(feature, 20, token);
      const batch = body.data?.templates ?? [];
      templates.push(...batch);
      token = body.data?.next_token;
      if (!token || batch.length === 0) break;
    }

    return NextResponse.json(
      { templates, complete: !token },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch (err) {
    if (err instanceof PerfectCorpError) {
      console.error(`[templates/${feature}] ${err.code}: ${err.message}`);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus === 401 ? 401 : 502 },
      );
    }
    console.error(`[templates/${feature}] unexpected:`, err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
