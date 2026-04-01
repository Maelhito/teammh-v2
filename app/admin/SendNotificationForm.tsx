"use client";

import { useState } from "react";

export default function SendNotificationForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      setMsg("Remplis le titre et le message.");
      return;
    }
    setSending(true);
    setMsg("");
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setSending(false);
    if (res.ok) {
      setMsg("✓ Notification envoyée à toutes les clientes");
      setTitle("");
      setBody("");
    } else {
      const data = await res.json();
      setMsg(data.error ?? "Erreur envoi");
    }
  }

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0 }}>
          ENVOYER UNE NOTIFICATION
        </h2>
      </div>

      <div style={{ backgroundColor: "#1A1A1A", borderRadius: 12, padding: "18px 20px", border: "1px solid #2a2a2a" }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
            TITRE
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex: 🔔 Nouveau contenu disponible"
            style={{
              width: "100%",
              backgroundColor: "#0D0D0D",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "9px 12px",
              color: "#FFFFFF",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
            MESSAGE
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ton message pour toutes les clientes..."
            rows={3}
            style={{
              width: "100%",
              backgroundColor: "#0D0D0D",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "9px 12px",
              color: "#FFFFFF",
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            backgroundColor: sending ? "#8B1515" : "#B22222",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: sending ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {sending ? "Envoi..." : "Envoyer à toutes"}
        </button>

        {msg && (
          <p style={{ fontSize: 12, marginTop: 10, color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
