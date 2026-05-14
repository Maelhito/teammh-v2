"use client";

import { useState, useEffect } from "react";

interface TeamMember {
  id: string;
  nom: string;
  titre: string;
  lien_zoom: string | null;
  role: "coach" | "nutrition";
}

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

export default function TeamAdmin() {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState("");
  const [titre, setTitre] = useState("");
  const [lienZoom, setLienZoom] = useState("");
  const [role, setRole] = useState<"coach" | "nutrition">("coach");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setError("Erreur chargement équipe"))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, titre, lien_zoom: lienZoom || null, role }),
      });
      if (res.ok) {
        const { member } = await res.json();
        setMembers((prev) => [...prev, member]);
        setNom("");
        setTitre("");
        setLienZoom("");
        setRole("coach");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erreur");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erreur suppression");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ marginTop: 32, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16 }}>
      {/* Header accordéon */}
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
            👥 MON ÉQUIPE
          </span>
        </div>
        <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* Formulaire ajout */}
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", letterSpacing: "0.04em" }}>
              AJOUTER UN MEMBRE
            </p>
            {/* Sélecteur de rôle */}
            <div style={{ display: "flex", gap: 8 }}>
              {([
                { value: "coach", label: "🔴 Coach", color: "#B22222" },
                { value: "nutrition", label: "🟢 Coach Nutrition", color: "#22C55E" },
              ] as const).map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: role === value ? color : "transparent",
                    border: `1px solid ${color}`,
                    borderRadius: 6,
                    color: role === value ? "#fff" : color,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="text"
                placeholder="Nom (ex: Maël)"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Titre (ex: Coach Sport)"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                style={inputStyle}
              />
            </div>
            <input
              type="url"
              placeholder="Lien Zoom (optionnel)"
              value={lienZoom}
              onChange={(e) => setLienZoom(e.target.value)}
              style={inputStyle}
            />
            {error && <p style={{ color: "#F87171", fontSize: 12, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 16px",
                backgroundColor: "#B22222",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                letterSpacing: "0.04em",
                alignSelf: "flex-start",
              }}
            >
              {saving ? "Ajout..." : "Ajouter"}
            </button>
          </form>

          {/* Liste des membres */}
          {loading ? (
            <p style={{ color: "#555", fontSize: 13 }}>Chargement...</p>
          ) : members.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>Aucun membre pour l&apos;instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    backgroundColor: "#0D0D0D",
                    borderRadius: 10,
                    border: "1px solid #1a1a1a",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#F5F5F0" }}>{m.nom}</p>
                      <span style={{
                        padding: "1px 7px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: m.role === "nutrition" ? "rgba(34,197,94,0.15)" : "rgba(178,34,34,0.15)",
                        color: m.role === "nutrition" ? "#22C55E" : "#B22222",
                        border: `1px solid ${m.role === "nutrition" ? "#22C55E" : "#B22222"}`,
                        flexShrink: 0,
                      }}>
                        {m.role === "nutrition" ? "Nutrition" : "Coach"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{m.titre}</p>
                    {m.lien_zoom && (
                      <a
                        href={m.lien_zoom}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#3B82F6", display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        Zoom →
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "transparent",
                      border: "1px solid #B22222",
                      borderRadius: 6,
                      color: "#B22222",
                      fontSize: 12,
                      cursor: deletingId === m.id ? "not-allowed" : "pointer",
                      opacity: deletingId === m.id ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {deletingId === m.id ? "…" : "Supprimer"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
