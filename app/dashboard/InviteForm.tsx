"use client";

import { useState } from "react";

export default function InviteForm() {
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, prenom }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Une erreur est survenue" });
    } else {
      setMessage({ type: "success", text: `Invitation envoyée à ${email} !` });
      setPrenom("");
      setEmail("");
    }
  }

  return (
    <div
      style={{
        marginTop: 40,
        backgroundColor: "#1A1A1A",
        borderRadius: 12,
        padding: 24,
        maxWidth: 420,
      }}
    >
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, letterSpacing: "0.05em" }}>
        INVITER UNE CLIENTE
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            PRÉNOM
          </label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
            placeholder="Marie"
            style={{
              width: "100%",
              backgroundColor: "#0D0D0D",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#FFFFFF",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="marie@exemple.com"
            style={{
              width: "100%",
              backgroundColor: "#0D0D0D",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#FFFFFF",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: loading ? "#8B1515" : "#B22222",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.05em",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Envoi en cours..." : "Envoyer l'invitation"}
        </button>
      </form>

      {message && (
        <p
          style={{
            marginTop: 14,
            fontSize: 13,
            color: message.type === "success" ? "#4ADE80" : "#F87171",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
