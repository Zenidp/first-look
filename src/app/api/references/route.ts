import { readdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { isReady, REFERENCE_LIBRARY, REGIONS, referencePath } from "@/lib/references";

export const runtime = "nodejs";

/**
 * GET /api/references
 *
 * The Nusantara library, split into what is actually usable and what is still
 * an empty slot. Costs nothing — this never touches Perfect Corp.
 *
 * A slot only becomes `ready` when all three exist: the image file, a credit
 * and a licence. That keeps an unattributed photo from reaching the UI by
 * accident, which matters here more than usual (see docs/FINDINGS.md §7).
 */
export async function GET() {
  let files: string[] = [];
  try {
    files = await readdir(path.join(process.cwd(), "public", "references"));
  } catch {
    // Directory not created yet — every slot is simply pending.
  }

  const available = new Set(
    files.filter((f) => /\.jpe?g$/i.test(f)).map((f) => f.replace(/\.jpe?g$/i, "")),
  );

  const ready = [];
  const pending = [];
  for (const item of REFERENCE_LIBRARY) {
    if (isReady(item, available)) {
      ready.push({ ...item, url: referencePath(item.id) });
    } else {
      pending.push({
        id: item.id,
        label: item.label,
        region: item.region,
        use: item.use,
        hijab: item.hijab ?? false,
        missing: [
          available.has(item.id) ? null : "image",
          item.credit.trim() ? null : "credit",
          item.license.trim() ? null : "license",
        ].filter(Boolean),
      });
    }
  }

  return NextResponse.json({
    regions: REGIONS,
    readyCount: ready.length,
    pendingCount: pending.length,
    ready,
    pending,
  });
}
