"use client";

// Global error boundary — only fires if app/error.tsx itself fails or
// if the root layout throws. Must include <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#FAFAF7",
          color: "#0A0A0A",
          margin: 0,
          padding: "10vh 6vw",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 56,
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          SOMETHING BROKE.
        </div>
        <p style={{ fontSize: 14, color: "#5A5A56", marginBottom: 28 }}>
          The app couldn’t recover. Try reloading.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#0A0A0A",
            color: "#FAFAF7",
            padding: "12px 20px",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            border: 0,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error?.digest && (
          <div
            style={{
              marginTop: 32,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#5A5A56",
            }}
          >
            ref · {error.digest}
          </div>
        )}
      </body>
    </html>
  );
}
