import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { site } from "@/config/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card.
 *
 * This link's whole job is to get forwarded — bride to rias, rias to the next
 * bride — so the card has to make the argument in a WhatsApp preview. It shows
 * the finished look photograph next to the sentence, because a bridal product
 * whose share card is a wordmark on a colour is indistinguishable from any
 * other SaaS link.
 *
 * The photograph is read from disk rather than fetched, because at build time
 * the site is not yet serving itself. If that read fails the card still
 * renders, minus the image — a plainer preview beats a build that cannot
 * produce one at all.
 *
 * It reads `og-look.jpg` and not the 1.1 MB fixture the same look comes from.
 * That was the first attempt and it failed silently: satori dropped the image
 * and emitted the fallback card with no error anywhere. og-look.jpg is that
 * fixture pre-cut to the exact 470x630 slot it fills here, 39 KB, so nothing
 * has to be decoded or rescaled while the card is being drawn.
 */
async function loadLook(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public/og-look.jpg"));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const look = await loadLook();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fbf9f5",
          color: "#1e1a17",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "68px 60px",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "#8a5347",
              }}
            >
              First Look
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 34,
                fontSize: 68,
                lineHeight: 1.08,
                letterSpacing: -1.6,
                maxWidth: 620,
              }}
            >
              See the wedding look before you pay for the trial.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 25,
              lineHeight: 1.45,
              color: "#5a5049",
              maxWidth: 600,
            }}
          >
            <div style={{ display: "flex" }}>
              Makeup, sanggul, kebaya and jewellery on one photo of her own face.
            </div>
            <div style={{ display: "flex", marginTop: 8 }}>
              Then: whether her hair is ready for the day.
            </div>
          </div>
        </div>

        {look && (
          <div style={{ display: "flex", width: 470, height: "100%" }}>
            {/* A plain <img> is required: this tree is rendered by satori,
                not by React DOM, and next/image means nothing to it. */}
            <img
              src={look}
              alt=""
              width={470}
              height={630}
              style={{ objectFit: "cover", width: 470, height: 630 }}
            />
          </div>
        )}
      </div>
    ),
    size,
  );
}
