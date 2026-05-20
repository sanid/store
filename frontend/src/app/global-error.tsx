"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 480, padding: "32px 24px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#78716c",
              marginBottom: 16,
            }}
          >
            Fehler 500
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 300, letterSpacing: "-0.01em" }}>
            Es ist ein Fehler aufgetreten
          </h1>
          <p style={{ margin: "16px 0 32px", fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
            Wir konnten Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es erneut. Wenn das
            Problem weiterhin besteht, kontaktieren Sie uns.
          </p>
          {error?.digest && (
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
                color: "#a8a29e",
                marginBottom: 24,
              }}
            >
              Referenz: {error.digest}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#1c1917",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
            <a
              href="/"
              style={{
                background: "transparent",
                color: "#1c1917",
                border: "1px solid #d6d3d1",
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
