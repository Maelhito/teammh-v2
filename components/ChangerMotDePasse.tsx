"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function ChangerMotDePasse({ theme = "sombre" }: { theme?: "sombre" | "clair" }) {
  const clair = theme === "clair";
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [succes, setSucces] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSucces(false);

    if (motDePasse.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: motDePasse });
    setLoading(false);

    if (updateError) {
      setError("Une erreur est survenue. Réessaie ou contacte le support.");
      return;
    }

    setSucces(true);
    setMotDePasse("");
    setConfirmation("");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: clair ? "#fff" : "#0D0D0D",
    border: clair ? "1px solid #e8e8e8" : "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "10px 12px",
    color: clair ? "#1a1a1a" : "#FFFFFF",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: clair ? "system-ui" : undefined,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: clair ? "#aaa" : "rgba(255,255,255,0.4)",
    marginBottom: 6,
    letterSpacing: "0.04em",
    fontWeight: clair ? 700 : undefined,
    textTransform: clair ? "uppercase" : undefined,
    fontFamily: clair ? "system-ui" : undefined,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOUVEAU MOT DE PASSE</label>
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="8 caractères minimum"
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>CONFIRMER LE MOT DE PASSE</label>
        <input
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
        />
      </div>

      {error && <p style={{ color: clair ? "#EF4444" : "#FF4444", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
      {succes && <p style={{ color: "#22C55E", fontSize: 13, margin: "0 0 12px" }}>Mot de passe mis à jour ✓</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "10px 18px",
          backgroundColor: "#B22222",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          letterSpacing: "0.04em",
          fontFamily: clair ? "system-ui" : undefined,
        }}
      >
        {loading ? "..." : "Mettre à jour"}
      </button>
    </form>
  );
}
