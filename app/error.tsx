"use client";

import Link from "next/link";

export default function GlobalErrorPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#f4f7fb"
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          padding: "2rem",
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 24px 80px rgba(16, 24, 40, 0.08)",
          textAlign: "center"
        }}
      >
        <p style={{ margin: 0, color: "#4f6b8a", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Server error
        </p>
        <h1 style={{ margin: "0.75rem 0", fontSize: "2rem", color: "#10243a" }}>Something went wrong.</h1>
        <p style={{ margin: 0, color: "#5f6f82", lineHeight: 1.6 }}>
          Please try again in a moment. If the issue continues, return to the dashboard or go back to the home page.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              padding: "0.85rem 1.2rem",
              borderRadius: 999,
              background: "#10243a",
              color: "#ffffff",
              textDecoration: "none"
            }}
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: "0.85rem 1.2rem",
              borderRadius: 999,
              border: "1px solid #cdd7e3",
              color: "#10243a",
              textDecoration: "none"
            }}
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
