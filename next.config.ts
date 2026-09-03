import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The Content-Security-Policy here is deliberately permissive in exactly two
 * places and strict everywhere else. `img-src` and `media-src` have to accept
 * arbitrary https origins because every try-on result, every catalogue
 * thumbnail and every generated clip is served from a Perfect Corp URL that is
 * signed, short-lived and not on a fixed host — pinning it would break the
 * product the first time they rotate a CDN.
 *
 * `script-src` keeps 'unsafe-inline' because Next.js emits inline bootstrap
 * scripts and the alternative is per-request nonces, which means routing every
 * page through proxy middleware. The directives that cost nothing and block the
 * most — frame-ancestors, object-src, base-uri, form-action — are all closed.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // Every image rendered through next/image in this app is a local file, so
    // no remote patterns are needed. API results go through a plain <img>
    // because their URLs expire in two hours and must never be cached.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // The app asks for a file, never for a live camera or a location.
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
