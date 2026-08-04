"use client";

import { useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";
import type { TtlStripeOffer } from "@/lib/ttl-stripe-offers";

export default function TtlPaiementOffers({ offers }: { offers: TtlStripeOffer[] }) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(slug: string) {
    setLoadingSlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/ttl/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible de lancer le paiement");
        setLoadingSlug(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
      setLoadingSlug(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && (
        <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 13, margin: 0 }}>{error}</p>
      )}
      {offers.map((offer) => (
        <div key={offer.slug} style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: 18 }}>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>{offer.label}</p>
          <button
            onClick={() => handlePay(offer.slug)}
            disabled={loadingSlug === offer.slug}
            className="font-body"
            style={{ width: "100%", padding: "13px 0", background: loadingSlug === offer.slug ? ttlColors.cardBorder : ttlColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loadingSlug === offer.slug ? "not-allowed" : "pointer" }}
          >
            {loadingSlug === offer.slug ? "..." : "Payer maintenant"}
          </button>
        </div>
      ))}
    </div>
  );
}
