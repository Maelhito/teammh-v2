"use client";

import { useState } from "react";

interface Client {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
}

interface Props {
  clients: Client[];
}

export default function CalendrierAdmin({ clients }: Props) {
  const [form, setForm] = useState({
    titre: "",
    date: "",
    recurrence: "none",
    message: "",
    lien: "",
    target_user_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/calendrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target_user_id: form.target_user_id || null,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ titre: "", date: "", recurrence: "none", message: "", lien: "", target_user_id: "" });
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        setErrorMsg(error ?? "Erreur");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erreur réseau");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F5F0", margin: 0, letterSpacing: "0.06em" }}>
          CALENDRIER
        </h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <select
          value={form.target_user_id}
          onChange={(e) => setForm((f) => ({ ...f, target_user_id: e.target.value }))}
          style={inputStyle}
        >
          <option value="">Toutes les clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Titre de l'événement"
          required
          value={form.titre}
          onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
          style={inputStyle}
        />

        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          style={inputStyle}
        />

        <select
          value={form.recurrence}
          onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
          style={inputStyle}
        >
          <option value="none">Sans récurrence</option>
          <option value="daily">Quotidienne</option>
          <option value="weekly">Hebdomadaire</option>
          <option value="monthly">Mensuelle</option>
        </select>

        <textarea
          placeholder="Message (optionnel)"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          style={{ ...inputStyle, minHeight: 72, resize: "none" }}
        />

        <input
          type="url"
          placeholder="Lien (optionnel)"
          value={form.lien}
          onChange={(e) => setForm((f) => ({ ...f, lien: e.target.value }))}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 16px",
            backgroundColor: "#B22222",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
          }}
        >
          {saving ? "Enregistrement..." : "CRÉER L'ÉVÉNEMENT"}
        </button>

        {status === "success" && (
          <p style={{ color: "#4ADE80", fontSize: "0.82rem", margin: 0 }}>✓ Événement créé avec succès</p>
        )}
        {status === "error" && (
          <p style={{ color: "#F87171", fontSize: "0.82rem", margin: 0 }}>✗ {errorMsg}</p>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "#0D0D0D",
  border: "1px solid #222",
  borderRadius: 8,
  color: "#F5F5F0",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
};
