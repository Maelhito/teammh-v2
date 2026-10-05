"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Mode = "login" | "forgot";

// wa = numéro international sans « + » ni espaces (format des liens wa.me).
// Chaque cliente ne voit que le numéro de son pays, d'après le fuseau de son appareil.
const CONTACT_NC = { affiche: "+687 93 33 32", wa: "687933332" };
const CONTACT_FR = { affiche: "06 58 63 00 59", wa: "33658630059" };

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

const buttonStyle = (loading: boolean): React.CSSProperties => ({
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
});

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enCaledonie, setEnCaledonie] = useState<boolean | null>(null);

  useEffect(() => {
    setEnCaledonie(Intl.DateTimeFormat().resolvedOptions().timeZone === "Pacific/Noumea");
  }, []);

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
            {mode === "login" && "Connexion à ton espace coaching"}
            {mode === "forgot" && "Réinitialiser ton mot de passe"}
          </p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ton@email.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>MOT DE PASSE</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(""); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", textAlign: "right", padding: 0, marginTop: -6 }}
            >
              Mot de passe oublié ?
            </button>

            {error && (
              <p style={{ color: "#FF4444", fontSize: 13, margin: 0, textAlign: "center" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? "CONNEXION..." : "SE CONNECTER"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: 0, textAlign: "center" }}>
              Demande à Maël ou Julie sur WhatsApp pour réinitialiser ton mot de passe.
            </p>

            {enCaledonie !== null && (() => {
              const contact = enCaledonie ? CONTACT_NC : CONTACT_FR;
              return (
                <a
                  href={`https://wa.me/${contact.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    backgroundColor: "#B22222",
                    borderRadius: 12,
                    padding: "16px",
                    textDecoration: "none",
                    textAlign: "center",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  WHATSAPP · {contact.affiche}
                </a>
              );
            })()}

            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
              À contacter uniquement sur WhatsApp. Une fois connectée, tu peux changer ton mot de passe toi-même depuis ton profil.
            </p>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              style={{ background: "none", border: "none", color: "#B22222", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", padding: 0 }}
            >
              ‹ Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
