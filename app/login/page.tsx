"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 1 12s4 8 11 8a10.94 10.94 0 0 0 5.11-1.27" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function eyeToggleStyle(): React.CSSProperties {
  return {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetSending(true);
    setResetMessage("");

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    setResetMessage("Si un compte existe avec cette adresse, un email de réinitialisation vient d'être envoyé.");
    setResetSending(false);
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
        {/* Logo / titre */}
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
            Connexion à ton espace coaching
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
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
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block" }}>
                MOT DE PASSE
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setResetEmail(email);
                  setResetMessage("");
                }}
                style={{ background: "none", border: "none", color: "#B22222", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  backgroundColor: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  borderRadius: 12,
                  padding: "14px 44px 14px 16px",
                  color: "#FFFFFF",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                style={eyeToggleStyle()}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
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
              backgroundColor: "#B22222",
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
            {loading ? "CONNEXION..." : "SE CONNECTER"}
          </button>
        </form>

        {forgotMode && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 10,
            }}
          >
            <div style={{ width: "100%", maxWidth: 380, backgroundColor: "#151515", border: "1px solid #2A2A2A", borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px" }}>
                Réinitialiser le mot de passe
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                Indique ton email, tu recevras un lien pour choisir un nouveau mot de passe.
              </p>

              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="ton@email.com"
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

                {resetMessage && (
                  <p style={{ color: "#4ADE80", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {resetMessage}
                  </p>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid #2A2A2A",
                      borderRadius: 12,
                      padding: "14px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={resetSending}
                    style={{
                      flex: 1,
                      backgroundColor: "#B22222",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 12,
                      padding: "14px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: resetSending ? "not-allowed" : "pointer",
                      opacity: resetSending ? 0.7 : 1,
                    }}
                  >
                    {resetSending ? "ENVOI..." : "ENVOYER"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
