/**
 * Structured data.
 *
 * `dangerouslySetInnerHTML` is the documented way to emit a JSON-LD block in
 * React — the alternative escapes the JSON and search engines reject it. The
 * input is always a literal built in src/lib/seo.ts, never user content.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
