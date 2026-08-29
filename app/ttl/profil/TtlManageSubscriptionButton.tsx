"use client";

import { useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";

export default function TtlManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ttl/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible d'ouvrir la gestion d'abonnement");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {error && (
        <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 12, margin: "0 0 8px" }}>{error}</p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="font-body"
        style={{
          width: "100%",
          padding: "14px 0",
          background: ttlColors.card,
          border: `1px solid ${ttlColors.cardBorder}`,
          borderRadius: 16,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "..." : "Gérer mon abonnement"}
      </button>
    </div>
  );
}
