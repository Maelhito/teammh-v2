"use client";

import { useState } from "react";
import Link from "next/link";

type State = "idle" | "loading" | "success";

export default function InscriptionPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<State>("idle");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#1A1A1A",
    border: "1px solid #2A2A2A",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#FFFFFF",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.6)",
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

    setState("loading");
    try {
      const res = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, nom, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setState("idle");
        return;
      }
      setState("success");
    } catch {
      setError("Impossible de contacter le serveur.");
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ backgroundColor: "#1A1A1A", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 16, padding: "40px 32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
            <h2 style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 12px" }}>
              COMPTE CRÉÉ !
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Ton compte est prêt. Connecte-toi dès maintenant avec ton email et ton mot de passe.
            </p>
            <Link href="/login" style={{ display: "block", backgroundColor: "#B22222", color: "#FFFFFF", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", textDecoration: "none" }}>
              SE CONNECTER →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.08em", margin: 0 }}>
            TIME TO MOVE
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 8, fontSize: 14 }}>
            Créer ton compte
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

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
            <p style={{ color: "#FF4444", fontSize: 13, margin: 0, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={state === "loading"}
            style={{ backgroundColor: state === "loading" ? "#8B1515" : "#B22222", color: "#FFFFFF", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: state === "loading" ? "not-allowed" : "pointer", opacity: state === "loading" ? 0.7 : 1, marginTop: 8 }}
          >
            {state === "loading" ? "CRÉATION..." : "CRÉER MON COMPTE"}
          </button>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
            Déjà un compte ?{" "}
            <Link href="/login" style={{ color: "#B22222", textDecoration: "none" }}>Se connecter</Link>
          </p>

        </form>
      </div>
    </div>
  );
}
