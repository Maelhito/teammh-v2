"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { ttsColors } from "@/lib/tts-theme";
import { TTS_OBJECTIF_OPTIONS, type TtsObjectifValue } from "@/lib/tts-objectifs";

type State = "idle" | "loading" | "success";

export default function InscriptionTtsPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [objectif, setObjectif] = useState<TtsObjectifValue | "">("");
  const [error, setError] = useState("");
  const [state, setState] = useState<State>("idle");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: ttsColors.card,
    border: `1px solid ${ttsColors.cardBorder}`,
    borderRadius: 12,
    padding: "14px 16px",
    color: "#FFFFFF",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    color: ttsColors.muted,
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
      const res = await fetch("/api/inscription-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, nom, email, password, objectif }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setState("idle");
        return;
      }
      localStorage.setItem("tts_show_welcome_new", "1");
      setState("success");
    } catch {
      setError("Impossible de contacter le serveur.");
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div style={{ backgroundColor: ttsColors.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ backgroundColor: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, padding: "40px 32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
            <h2 className="font-body" style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 12px" }}>
              COMPTE CRÉÉ !
            </h2>
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Ton compte Time To Start est prêt. Connecte-toi dès maintenant avec ton email et ton mot de passe.
            </p>
            <Link href="/login" className="font-body" style={{ display: "block", backgroundColor: ttsColors.red, color: "#FFFFFF", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", textDecoration: "none" }}>
              SE CONNECTER →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: ttsColors.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: "#000", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>
            🔥
          </div>
          <h1 className="font-body" style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.08em", margin: 0 }}>
            TIME TO START
          </h1>
          <p className="font-body" style={{ color: ttsColors.muted, marginTop: 8, fontSize: 14 }}>
            Créer ton compte
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={labelStyle}>TON OBJECTIF</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TTS_OBJECTIF_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setObjectif(o.value)}
                  className="font-body"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: objectif === o.value ? ttsColors.red : ttsColors.card,
                    border: `1px solid ${objectif === o.value ? ttsColors.red : ttsColors.cardBorder}`,
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
            <PasswordInput style={inputStyle} value={password} onChange={setPassword} placeholder="8 caractères minimum" required autoComplete="new-password" toggleColor={ttsColors.muted} />
          </div>

          <div>
            <label style={labelStyle}>CONFIRMER LE MOT DE PASSE</label>
            <PasswordInput style={inputStyle} value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" toggleColor={ttsColors.muted} />
          </div>

          {error && (
            <p className="font-body" style={{ color: "#FF4444", fontSize: 13, margin: 0, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={state === "loading"}
            className="font-body"
            style={{ backgroundColor: state === "loading" ? "#8B1515" : ttsColors.red, color: "#FFFFFF", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: state === "loading" ? "not-allowed" : "pointer", opacity: state === "loading" ? 0.7 : 1, marginTop: 8 }}
          >
            {state === "loading" ? "CRÉATION..." : "CRÉER MON COMPTE"}
          </button>

          <p className="font-body" style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
            Déjà un compte ?{" "}
            <Link href="/login" style={{ color: ttsColors.redBright, textDecoration: "none" }}>Se connecter</Link>
          </p>

        </form>
      </div>
    </div>
  );
}
