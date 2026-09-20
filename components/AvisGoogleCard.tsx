"use client";

import { useEffect, useState } from "react";

const GOOGLE_REVIEW_URL = "https://g.page/r/CdeU5wDHz9JJEAE/review";

/**
 * Badge "avis Google" affiché à J+60 sur le dashboard, tant que la cliente n'a
 * pas répondu. "Ça va, mais..." part comme message interne au coach (jamais
 * vers Google) ; "J'adore !" redirige vers la fiche d'avis.
 */
export default function AvisGoogleCard({ eligible }: { eligible: boolean }) {
  const [loading, setLoading] = useState(true);
  const [responded, setResponded] = useState(true);
  const [mode, setMode] = useState<"choix" | "message" | "envoye">("choix");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!eligible) { setLoading(false); return; }
    fetch("/api/avis-google")
      .then((r) => r.json())
      .then((d) => setResponded(!!d.responded))
      .catch(() => setResponded(true))
      .finally(() => setLoading(false));
  }, [eligible]);

  if (!eligible || loading || responded) return null;

  async function envoyer(reponse: "positif" | "mitige") {
    if (reponse === "mitige" && !message.trim()) {
      setErreur("Écris un petit mot avant d'envoyer.");
      return;
    }
    setSending(true);
    setErreur("");
    try {
      const res = await fetch("/api/avis-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponse, message: reponse === "mitige" ? message : undefined }),
      });
      if (!res.ok) throw new Error();
      if (reponse === "positif") {
        window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
        setResponded(true);
      } else {
        setMode("envoye");
      }
    } catch {
      setErreur("Un souci est survenu, réessaie.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: "8px 16px" }}>
      <div style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 14, padding: "16px 18px" }}>
        {mode === "envoye" ? (
          <p className="font-body" style={{ fontSize: "0.85rem", color: "#FFFFFF", margin: 0, lineHeight: 1.5 }}>
            Merci, ton message est bien parti à ton coach. 💬
          </p>
        ) : mode === "message" ? (
          <>
            <p className="font-body" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>
              Dis-nous ce qui ne va pas
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ton message pour ton coach…"
              rows={3}
              style={{
                width: "100%", borderRadius: 9, border: "1px solid rgba(255,255,255,0.25)",
                backgroundColor: "rgba(0,0,0,0.25)", color: "#FFFFFF", fontSize: "0.85rem",
                padding: "10px 12px", fontFamily: "inherit", resize: "vertical", marginBottom: 8,
              }}
            />
            {erreur && (
              <p className="font-body" style={{ fontSize: "0.72rem", color: "#FCA5A5", margin: "0 0 8px" }}>{erreur}</p>
            )}
            <button
              onClick={() => envoyer("mitige")}
              disabled={sending}
              style={{
                width: "100%", padding: "10px 14px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9,
                color: "#FFF", fontSize: "0.8rem", fontWeight: 700, border: "none", letterSpacing: "0.04em",
                cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? "Envoi…" : "Envoyer à mon coach"}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                ⭐
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                  2 MOIS AVEC TIME TO MOVE
                </p>
                <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF", margin: "2px 0 0" }}>
                  Comment se passe ton accompagnement ?
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMode("message")}
                style={{
                  flex: 1, padding: "10px 8px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9,
                  color: "#FFF", fontSize: "0.78rem", fontWeight: 700, border: "none", cursor: "pointer",
                }}
              >
                Ça va, mais...
              </button>
              <button
                onClick={() => envoyer("positif")}
                disabled={sending}
                style={{
                  flex: 1, padding: "10px 8px", backgroundColor: "#FFFFFF", borderRadius: 9,
                  color: "#B22222", fontSize: "0.78rem", fontWeight: 700, border: "none",
                  cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1,
                }}
              >
                J&apos;adore !
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
