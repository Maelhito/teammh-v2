"use client";

import { useState } from "react";
import Link from "next/link";
import { ttlColors } from "@/lib/ttl-theme";
import { TTL_OBJECTIF_OPTIONS, type TtlObjectifValue } from "@/lib/ttl-objectifs";

type State = "idle" | "loading" | "success";

/**
 * Le fuseau de l'appareil, envoyé dès l'inscription : sans lui, la nouvelle
 * cliente hérite du repli jusqu'à sa première ouverture de l'app — ses
 * notifications et sa date de démarrage seraient calées sur le mauvais pays.
 */
function fuseauAppareil(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

export default function InscriptionTtlPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [objectif, setObjectif] = useState<TtlObjectifValue | "">("");
  const [error, setError] = useState("");
  const [state, setState] = useState<State>("idle");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: ttlColors.card,
    border: `1px solid ${ttlColors.cardBorder}`,
    borderRadius: 12,
    padding: "14px 16px",
    color: "#FFFFFF",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    color: ttlColors.muted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: 6,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!objectif) {
      setError("Choisis ton objectif pour continuer.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/inscription-ttl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, nom, email, password, objectif , timezone: fuseauAppareil()}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setState("idle");
        return;
      }
      localStorage.setItem("ttl_show_welcome_new", "1");
      setState("success");
    } catch {
      setError("Impossible de contacter le serveur.");
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div style={{ backgroundColor: ttlColors.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ backgroundColor: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "40px 32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
            <h2 className="font-body" style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 12px" }}>
              COMPTE CRÉÉ !
            </h2>
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Ton compte Time To Last est prêt. Connecte-toi dès maintenant avec ton email et ton mot de passe.
            </p>
            <Link href="/login" className="font-body" style={{ display: "block", backgroundColor: ttlColors.red, color: "#FFFFFF", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", textDecoration: "none" }}>
              SE CONNECTER →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: ttlColors.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: "#000", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>
            🔥
          </div>
          <h1 className="font-body" style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.08em", margin: 0 }}>
            TIME TO LAST
          </h1>
          <p className="font-body" style={{ color: ttlColors.muted, marginTop: 8, fontSize: 14 }}>
            Créer ton compte
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={labelStyle}>TON OBJECTIF</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TTL_OBJECTIF_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setObjectif(o.value)}
                  className="font-body"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: objectif === o.value ? ttlColors.red : ttlColors.card,
                    border: `1px solid ${objectif === o.value ? ttlColors.red : ttlColors.cardBorder}`,
                    color: "#fff", fontSize: 14, fontWeight: objectif === o.value ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{o.emoji}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>PRÉNOM</label>
              <input style={inputStyle} type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" required autoComplete="given-name" />
            </div>
            <div>
              <label style={labelStyle}>NOM</label>
              <input style={inputStyle} type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" autoComplete="family-name" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>EMAIL</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" required autoComplete="email" />
          </div>

          <div>
            <label style={labelStyle}>MOT DE PASSE</label>
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required autoComplete="new-password" />
          </div>

          <div>
            <label style={labelStyle}>CONFIRMER LE MOT DE PASSE</label>
            <input style={inputStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
          </div>

          {error && (
            <p className="font-body" style={{ color: "#FF4444", fontSize: 13, margin: 0, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={state === "loading"}
            className="font-body"
            style={{ backgroundColor: state === "loading" ? "#8B1515" : ttlColors.red, color: "#FFFFFF", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: state === "loading" ? "not-allowed" : "pointer", opacity: state === "loading" ? 0.7 : 1, marginTop: 8 }}
          >
            {state === "loading" ? "CRÉATION..." : "CRÉER MON COMPTE"}
          </button>

          <p className="font-body" style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
            Déjà un compte ?{" "}
            <Link href="/login" style={{ color: ttlColors.redBright, textDecoration: "none" }}>Se connecter</Link>
          </p>

        </form>
      </div>
    </div>
  );
}
