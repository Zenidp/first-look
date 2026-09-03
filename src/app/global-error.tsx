"use client";

/**
 * The last resort: a failure in the root layout itself.
 *
 * This replaces <html> and <body>, so it inherits nothing — not the fonts, not
 * the tokens, not globals.css. Every style here is therefore inline and
 * deliberately plain. Importing the stylesheet would risk this page failing for
 * the same reason the layout did.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fbf9f5",
          color: "#1e1a17",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <h1 style={{ fontSize: "1.75rem", lineHeight: 1.2, margin: 0 }}>
            First Look is having trouble.
          </h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6, color: "#5a5049" }}>
            The app failed to load completely. A reload usually fixes it; if not,
            try again in a few minutes.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: "1.5rem",
              minHeight: "3rem",
              padding: "0 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#1e1a17",
              color: "#fbf9f5",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#7a6f66" }}>
              Incident code: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
