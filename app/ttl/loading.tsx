import { ttlColors } from "@/lib/ttl-theme";

/**
 * Affiché immédiatement au clic, le temps que la page suivante se prépare
 * sur le serveur : sans lui, rien ne bougeait pendant plusieurs secondes et
 * la cliente pensait que son clic n'avait pas marché.
 */
export default function TtlLoading() {
  return (
    <div style={{ backgroundColor: ttlColors.bg, minHeight: "100vh" }}>
      <style>{`
        @keyframes ttl-shimmer { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }
        @keyframes ttl-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <div style={{ height: 120, background: `linear-gradient(135deg, ${ttlColors.red} 0%, ${ttlColors.redDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "ttl-spin 0.8s linear infinite" }} />
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {[96, 64, 64, 64].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 16, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, animation: "ttl-shimmer 1.2s ease-in-out infinite" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
