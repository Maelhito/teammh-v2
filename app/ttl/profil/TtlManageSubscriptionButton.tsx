"use client";

import { useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";
import { TTL_MOTIFS_ARRET, TTL_REVIENDRAIT_LABELS } from "@/lib/ttl-resiliation";

type Etape = "ferme" | "choix" | "questionnaire";

const carte = {
  background: ttlColors.card,
  border: `1px solid ${ttlColors.cardBorder}`,
  borderRadius: 16,
  color: ttlColors.text,
} as const;

export default function TtlManageSubscriptionButton() {
  const [etape, setEtape] = useState<Etape>("ferme");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [motifs, setMotifs] = useState<string[]>([]);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [reviendrait, setReviendrait] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");

  async function ouvrirPortail() {
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

  /** Enregistre les réponses (sans jamais bloquer), puis ouvre Stripe. */
  async function envoyerPuisPortail(avecReponses: boolean) {
    if (avecReponses) {
      setLoading(true);
      try {
        await fetch("/api/ttl/resiliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motifs, satisfaction, reviendrait, commentaire }),
        });
      } catch {
        // on ne retient pas la cliente pour ça
      }
    }
    await ouvrirPortail();
  }

  function basculerMotif(m: string) {
    setMotifs((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  const puce = (actif: boolean) => ({
    ...carte,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${actif ? ttlColors.red : ttlColors.cardBorder}`,
    background: actif ? ttlColors.red : ttlColors.card,
    color: actif ? "#fff" : ttlColors.text,
  });

  return (
    <div style={{ marginTop: 12 }}>
      {error && etape === "ferme" && (
        <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 12, margin: "0 0 8px" }}>{error}</p>
      )}
      <button
        onClick={() => { setError(null); setEtape("choix"); }}
        className="font-body"
        style={{ ...carte, width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
      >
        Gérer mon abonnement
      </button>

      {etape !== "ferme" && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !loading && setEtape("ferme")}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="font-body"
            style={{
              background: ttlColors.bg, color: ttlColors.text, width: "100%", maxWidth: 480,
              maxHeight: "92vh", overflowY: "auto", borderRadius: "20px 20px 0 0",
              padding: "22px 18px calc(22px + env(safe-area-inset-bottom))",
              border: `1px solid ${ttlColors.cardBorder}`,
            }}
          >
            {etape === "choix" && (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Gérer mon abonnement</p>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: ttlColors.textSoft }}>Que veux-tu faire ?</p>
                {error && <p style={{ color: ttlColors.redBright, fontSize: 12, margin: "0 0 8px" }}>{error}</p>}
                <button
                  disabled={loading}
                  onClick={() => envoyerPuisPortail(false)}
                  style={{ ...carte, width: "100%", padding: "14px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}
                >
                  {loading ? "..." : "Modifier ma carte ou voir mes factures"}
                </button>
                <button
                  disabled={loading}
                  onClick={() => setEtape("questionnaire")}
                  style={{ ...carte, width: "100%", padding: "14px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}
                >
                  Arrêter Time To Live
                </button>
                <button
                  onClick={() => setEtape("ferme")}
                  style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: ttlColors.muted, fontSize: 13, cursor: "pointer" }}
                >
                  Annuler
                </button>
              </>
            )}

            {etape === "questionnaire" && (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Avant de partir 🤍</p>
                <p style={{ margin: "0 0 18px", fontSize: 13, color: ttlColors.textSoft, lineHeight: 1.5 }}>
                  Ça prend une minute et ça nous aide à améliorer l&apos;application. Tout est facultatif.
                </p>

                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Pourquoi veux-tu arrêter ? (plusieurs choix possibles)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {TTL_MOTIFS_ARRET.map((m) => (
                    <button key={m} onClick={() => basculerMotif(m)} style={puce(motifs.includes(m))}>{m}</button>
                  ))}
                </div>

                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Ta satisfaction globale</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setSatisfaction(n)} style={{ ...puce(satisfaction === n), flex: 1, padding: "10px 0" }}>{n}</button>
                  ))}
                </div>

                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Reviendrais-tu un jour ?</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {Object.entries(TTL_REVIENDRAIT_LABELS).map(([cle, label]) => (
                    <button key={cle} onClick={() => setReviendrait(cle)} style={puce(reviendrait === cle)}>{label}</button>
                  ))}
                </div>

                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Qu&apos;est-ce qui t&apos;aurait fait rester ?</p>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Dis-nous tout, on lit chaque réponse."
                  style={{ ...carte, width: "100%", padding: 12, fontSize: 16, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />

                {error && <p style={{ color: ttlColors.redBright, fontSize: 12, margin: "10px 0 0" }}>{error}</p>}
                <button
                  disabled={loading}
                  onClick={() => envoyerPuisPortail(true)}
                  style={{
                    width: "100%", marginTop: 16, padding: "14px 0", background: ttlColors.red, color: "#fff",
                    border: "none", borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "..." : "Continuer vers la gestion de l'abonnement"}
                </button>
                <button
                  disabled={loading}
                  onClick={() => envoyerPuisPortail(false)}
                  style={{ width: "100%", padding: 12, background: "transparent", border: "none", color: ttlColors.muted, fontSize: 13, cursor: "pointer" }}
                >
                  Passer cette étape
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
