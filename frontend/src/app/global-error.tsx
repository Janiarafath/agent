"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE || "";
      if (api) {
        fetch(`${api}/api/client-log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            where: "global-error",
            message: String(error?.message || error).slice(0, 500),
            stack: String(error?.stack || "").slice(0, 1000),
            url: typeof window !== "undefined" ? window.location.href : "",
          }),
        }).catch(() => {});
      }
    } catch {}
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "sans-serif", padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something broke loading DashWin.</h2>
        <p style={{ color: "#555", marginTop: 8 }}>
          Code: <code>{String(error?.message || "unknown").slice(0, 200)}</code>
        </p>
        <p style={{ color: "#555", fontSize: 13 }}>Screenshot this page and send it to support — it names the bug.</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: 16, background: "#5951ff", color: "#fff", padding: "10px 20px", borderRadius: 4, border: 0, fontWeight: 700 }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
