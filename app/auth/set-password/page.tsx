"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Une erreur est survenue. Réessaie ou contacte le support.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div
      style={{
        backgroundColor: "#0D0D0D",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            TIME TO MOVE
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 8, fontSize: 14 }}>
            Choisis ton mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="8 caractères minimum"
              style={{
                width: "100%",
                backgroundColor: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "14px 16px",
                color: "#FFFFFF",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              CONFIRMER LE MOT DE PASSE
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                backgroundColor: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "14px 16px",
                color: "#FFFFFF",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#FF4444", fontSize: 13, margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#8B1515" : "#B22222",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "16px",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.05em",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: 8,
            }}
          >
            {loading ? "ENREGISTREMENT..." : "ACCÉDER À MON ESPACE"}
          </button>
        </form>
      </div>
    </div>
  );
}
