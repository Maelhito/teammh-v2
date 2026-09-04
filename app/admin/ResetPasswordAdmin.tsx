"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#0D0D0D",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#FFFFFF",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export default function ResetPasswordAdmin() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (res.ok) {
        setResult({ email: d.email, password: d.password });
        setEmail("");
      } else {
        setError(d.error ?? "Erreur");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function copierMessage() {
    if (!result) return;
    const message = `Voici tes accès Time to Move :\nEmail : ${result.email}\nMot de passe : ${result.password}\n\nConnecte-toi sur teammj-v2.vercel.app/login`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginTop: 32, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#F5F5F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 3, height: 16, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.05em" }}>
            🔑 RÉINITIALISER UN MOT DE PASSE
          </span>
        </div>
        <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Entre l&apos;email d&apos;un coach ou d&apos;une cliente pour lui générer un nouveau mot de passe
            immédiatement (sans passer par un email). Tu pourras ensuite le lui transmettre toi-même.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="email@exemple.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 16px",
                backgroundColor: "#B22222",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              {loading ? "..." : "Générer"}
            </button>
          </form>

          {error && <p style={{ color: "#F87171", fontSize: 12, margin: "10px 0 0" }}>{error}</p>}

          {result && (
            <div style={{ marginTop: 14, padding: "14px 16px", backgroundColor: "#0D0D0D", borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#22C55E", fontWeight: 700 }}>
                Nouveau mot de passe généré pour {result.email}
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 16, fontFamily: "monospace", color: "#F5F5F0", letterSpacing: "0.05em" }}>
                {result.password}
              </p>
              <button
                onClick={copierMessage}
                style={{
                  padding: "7px 14px",
                  backgroundColor: copied ? "#22C55E" : "transparent",
                  border: "1px solid #22C55E",
                  borderRadius: 6,
                  color: copied ? "#0D0D0D" : "#22C55E",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {copied ? "Copié ✓" : "Copier le message à envoyer"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
