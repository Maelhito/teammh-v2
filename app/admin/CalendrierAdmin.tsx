"use client";

import { useState } from "react";

interface Client {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
}

interface AdminEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: string;
  rappel: boolean;
  target_user_id: string | null;
}

interface Props {
  clients: Client[];
}

const RECURRENCE_LABELS: Record<string, string> = {
  none: "",
  daily: "Quotidien",
  weekly: "Hebdo",
  monthly: "Mensuel",
};

function clientLabel(c: Client) {
  return c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email;
}

export default function CalendrierAdmin({ clients }: Props) {
  const [form, setForm] = useState({
    titre: "",
    date: "",
    heure: "",
    recurrence: "none",
    message: "",
    lien: "",
    target_user_id: "",
    rappel: false,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Accordion
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("__all__");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          heure: form.heure || null,
          target_user_id: form.target_user_id || null,
        }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setStatus("success");
        setAdminEvents((prev) => [...prev, event]);
        setForm({ titre: "", date: "", heure: "", recurrence: "none", message: "", lien: "", target_user_id: "", rappel: false });
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

  async function openAccordion() {
    const willOpen = !accordionOpen;
    setAccordionOpen(willOpen);
    if (willOpen) {
      setLoadingEvents(true);
      try {
        const res = await fetch("/api/admin/calendrier");
        if (res.ok) {
          const { events } = await res.json();
          setAdminEvents(events ?? []);
        }
      } finally {
        setLoadingEvents(false);
      }
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/calendrier?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAdminEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const clientIdsWithEvents = new Set(
    adminEvents.filter((e) => e.target_user_id !== null).map((e) => e.target_user_id!)
  );
  const tabClients = clients.filter((c) => clientIdsWithEvents.has(c.id));

  const filteredEvents = adminEvents.filter((e) =>
    activeTab === "__all__" ? e.target_user_id === null : e.target_user_id === activeTab
  );

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
            <option key={c.id} value={c.id}>{clientLabel(c)}</option>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="time"
            value={form.heure}
            onChange={(e) => setForm((f) => ({ ...f, heure: e.target.value }))}
            style={{ ...inputStyle, color: form.heure ? "#F5F5F0" : "#555" }}
          />
        </div>

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

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
          <input
            type="checkbox"
            checked={form.rappel}
            onChange={(e) => setForm((f) => ({ ...f, rappel: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: "#B22222", cursor: "pointer", flexShrink: 0 }}
          />
          <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
            🔔 Rappel — notification push la veille
          </span>
        </label>

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

        {status === "success" && <p style={{ color: "#4ADE80", fontSize: "0.82rem", margin: 0 }}>✓ Événement créé</p>}
        {status === "error" && <p style={{ color: "#F87171", fontSize: "0.82rem", margin: 0 }}>✗ {errorMsg}</p>}
      </form>

      {/* Accordéon */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={openAccordion}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            backgroundColor: "#111111",
            border: "1px solid #222",
            borderRadius: accordionOpen ? "8px 8px 0 0" : 8,
            color: "#F5F5F0",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <span>Mes événements créés</span>
          <span style={{ fontSize: "0.7rem", color: "#555" }}>{accordionOpen ? "▲" : "▼"}</span>
        </button>

        {accordionOpen && (
          <div style={{ border: "1px solid #222", borderTop: "none", borderRadius: "0 0 8px 8px", backgroundColor: "#0a0a0a" }}>
            {loadingEvents ? (
              <p style={{ color: "#555", fontSize: "0.8rem", textAlign: "center", padding: 16, margin: 0 }}>Chargement…</p>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #1a1a1a", padding: "0 8px" }}>
                  <button onClick={() => setActiveTab("__all__")} style={tabBtnStyle(activeTab === "__all__")}>
                    Toutes les clientes {adminEvents.filter((e) => e.target_user_id === null).length > 0 && `(${adminEvents.filter((e) => e.target_user_id === null).length})`}
                  </button>
                  {tabClients.map((c) => {
                    const count = adminEvents.filter((e) => e.target_user_id === c.id).length;
                    return (
                      <button key={c.id} onClick={() => setActiveTab(c.id)} style={tabBtnStyle(activeTab === c.id)}>
                        {clientLabel(c)} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Event list */}
                <div style={{ padding: "4px 12px 8px", maxHeight: 340, overflowY: "auto" }}>
                  {filteredEvents.length === 0 ? (
                    <p style={{ color: "#555", fontSize: "0.78rem", textAlign: "center", margin: "14px 0" }}>Aucun événement</p>
                  ) : (
                    filteredEvents.map((evt) => (
                      <div key={evt.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid #1a1a1a",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: "#F5F5F0", fontSize: "0.8rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {evt.rappel ? "🔔 " : ""}{evt.titre}
                          </p>
                          <p style={{ color: "#555", fontSize: "0.7rem", margin: "2px 0 0" }}>
                            {evt.date}
                            {evt.heure ? ` à ${evt.heure.slice(0, 5)}` : ""}
                            {RECURRENCE_LABELS[evt.recurrence] ? ` · ${RECURRENCE_LABELS[evt.recurrence]}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          disabled={deletingId === evt.id}
                          style={{
                            padding: "3px 8px",
                            backgroundColor: "transparent",
                            border: "1px solid #B22222",
                            borderRadius: 6,
                            color: "#B22222",
                            fontSize: "0.7rem",
                            cursor: deletingId === evt.id ? "not-allowed" : "pointer",
                            opacity: deletingId === evt.id ? 0.5 : 1,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {deletingId === evt.id ? "…" : "Désactiver"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 10px",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #B22222" : "2px solid transparent",
    color: active ? "#F5F5F0" : "#555",
    fontSize: "0.72rem",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap",
    letterSpacing: "0.03em",
  };
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
