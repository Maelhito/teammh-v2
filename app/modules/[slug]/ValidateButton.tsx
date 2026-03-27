"use client";

import { useState } from "react";

interface Props {
  slug: string;
  initialCompleted: boolean;
}

export default function ValidateButton({ slug, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  if (completed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: "#111111",
          border: "1px solid rgba(74,222,128,0.3)",
          borderRadius: 12,
          padding: "14px 0",
          marginTop: 24,
          color: "#4ADE80",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        ✓ MODULE COMPLÉTÉ
      </div>
    );
  }

  async function handleValidate() {
    setLoading(true);
    const res = await fetch("/api/modules/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setLoading(false);
    if (res.ok) setCompleted(true);
  }

  return (
    <button
      onClick={handleValidate}
      disabled={loading}
      style={{
        width: "100%",
        backgroundColor: loading ? "#1a1a1a" : "#111111",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "14px 0",
        marginTop: 24,
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.04em",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "..." : "✓ Valider ce module"}
    </button>
  );
}
