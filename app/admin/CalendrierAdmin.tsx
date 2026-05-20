"use client";

import { useState, useEffect, useMemo } from "react";

interface Client {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
}

interface TeamMember {
  id: string;
  nom: string;
  titre: string;
  role: "coach" | "nutrition";
  lien_zoom: string | null;
}

interface CalEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: string;
  target_user_id: string | null;
  event_type: string | null;
  lien: string | null;
  message: string | null;
  created_by: string;
}

interface Props {
  clients: Client[];
  teamMembers: TeamMember[];
}

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_COURT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const EV_COLOR: Record<string, string> = {
  coach:           "#B22222",
  nutrition:       "#22C55E",
  coaching_groupe: "#3B82F6",
  tache:           "#8B5CF6",
};

function evColor(e: CalEvent) {
  return EV_COLOR[e.event_type ?? ""] ?? "#888";
}

function clientLabel(c: Client) {
  return c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email;
}

function isEventOnDay(ev: CalEvent, day: Date): boolean {
  const evDate = new Date(ev.date + "T00:00:00");
  evDate.setHours(0, 0, 0, 0);
  if (evDate > day) return false;
  const d = new Date(day); d.setHours(0, 0, 0, 0);
  switch (ev.recurrence) {
    case "none":    return evDate.toDateString() === d.toDateString();
    case "daily":   return true;
    case "weekly":  return evDate.getDay() === d.getDay();
    case "monthly": return evDate.getDate() === d.getDate();
    default:        return false;
  }
}

const DEFAULT_FORM = {
  titre: "", date: "", heure: "", recurrence: "none",
  event_type: "coach", message: "", lien: "",
};

export default function CalendrierAdmin({ clients, teamMembers }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState("");

  // Modal state
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Detail popup
  const [detail, setDetail] = useState<CalEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/calendrier")
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Calendar grid
  const base = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const cells = useMemo(() => {
    const month = base.getMonth();
    const year = base.getFullYear();
    const firstDay = new Date(year, month, 1);
    const startDay = new Date(firstDay);
    const dow = firstDay.getDay();
    startDay.setDate(firstDay.getDate() - (dow === 0 ? 6 : dow - 1));
    const arr: Date[] = [];
    const cur = new Date(startDay);
    while (arr.length < 42) { arr.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return arr;
  }, [base]);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  function openModal(date?: string) {
    setForm({ ...DEFAULT_FORM, date: date ?? "" });
    setTargetMode("all");
    setClientSearch("");
    setSelectedClientId("");
    setSaveError("");
    setPrefilledDate(date ?? "");
    setShowModal(true);
  }

  // Auto-fill Zoom link when event_type changes
  function handleTypeChange(type: string) {
    const member = teamMembers.find(m =>
      (type === "coach" && m.role === "coach") ||
      (type === "nutrition" && m.role === "nutrition")
    );
    setForm(f => ({ ...f, event_type: type, lien: member?.lien_zoom ?? f.lien }));
  }

  const filteredClients = useMemo(() =>
    clients.filter(c => clientLabel(c).toLowerCase().includes(clientSearch.toLowerCase())),
    [clients, clientSearch]
  );

  async function handleSave() {
    if (!form.titre || !form.date) { setSaveError("Titre et date requis"); return; }
    if (targetMode === "specific" && !selectedClientId) { setSaveError("Sélectionne une cliente"); return; }
    setSaving(true); setSaveError("");
    const res = await fetch("/api/admin/calendrier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        heure: form.heure || null,
        target_user_id: targetMode === "specific" ? selectedClientId : null,
      }),
    });
    if (res.ok) {
      const { event } = await res.json();
      setEvents(prev => [...prev, event]);
      setShowModal(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Erreur");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/admin/calendrier?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== id));
      setDetail(null);
    }
    setDeletingId(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 8,
    border: "1px solid #2a2a2a", backgroundColor: "#0D0D0D",
    color: "#F5F5F0", fontSize: 13, fontFamily: "system-ui",
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: "#555",
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5,
    fontFamily: "system-ui",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setMonthOffset(o => o - 1)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #222", background: "#111", color: "#888", cursor: "pointer", fontSize: 14 }}>‹</button>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", fontFamily: "system-ui", minWidth: 180, textAlign: "center" }}>
            {MOIS[base.getMonth()]} {base.getFullYear()}
          </span>
          <button onClick={() => setMonthOffset(o => o + 1)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #222", background: "#111", color: "#888", cursor: "pointer", fontSize: 14 }}>›</button>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #222", background: "#111", color: "#555", cursor: "pointer", fontSize: 11, fontFamily: "system-ui" }}>Aujourd&apos;hui</button>
          )}
        </div>

        {/* Légende + bouton */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { color: "#B22222", label: "Coach" },
              { color: "#22C55E", label: "Nutrition" },
              { color: "#3B82F6", label: "Coaching groupe" },
              { color: "#8B5CF6", label: "Tâche" },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#555", fontFamily: "system-ui" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
          <button
            onClick={() => openModal()}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", boxShadow: "0 2px 8px rgba(178,34,34,0.3)" }}
          >
            + Créer un événement
          </button>
        </div>
      </div>

      {/* Grille unifiée : headers + cellules dans un seul grid pour alignement parfait */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#555", fontFamily: "system-ui", fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {/* Ligne headers jours */}
          {JOURS_COURT.map(j => (
            <div key={j} style={{ textAlign: "center", padding: "8px 4px", backgroundColor: "#0D0D0D", borderRadius: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "system-ui" }}>{j}</span>
            </div>
          ))}

          {/* Cellules */}
          {cells.map((day, i) => {
            const isCurrentMonth = day.getMonth() === base.getMonth();
            const isToday = day.toDateString() === today.toDateString();
            const dayEvents = events.filter(ev => isEventOnDay(ev, day));
            const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;

            return (
              <div key={i}
                onClick={() => openModal(dateStr)}
                style={{
                  height: 100, padding: "5px 5px", borderRadius: 7, cursor: "pointer",
                  border: isToday ? "1.5px solid #B22222" : "1px solid #1a1a1a",
                  backgroundColor: isToday ? "rgba(178,34,34,0.05)" : isCurrentMonth ? "#111" : "#0a0a0a",
                  opacity: isCurrentMonth ? 1 : 0.35,
                  overflow: "hidden",
                  transition: "background 0.1s",
                  boxSizing: "border-box",
                }}
                onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#161616"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = isToday ? "rgba(178,34,34,0.05)" : isCurrentMonth ? "#111" : "#0a0a0a"; }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isToday ? "#B22222" : "transparent",
                    fontSize: 11, fontWeight: isToday ? 800 : 500,
                    color: isToday ? "#fff" : isCurrentMonth ? "#F5F5F0" : "#444",
                    fontFamily: "system-ui", flexShrink: 0,
                  }}>
                    {day.getDate()}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id}
                      onClick={e => { e.stopPropagation(); setDetail(ev); }}
                      style={{
                        padding: "2px 5px", borderRadius: 3,
                        backgroundColor: `${evColor(ev)}18`,
                        borderLeft: `2px solid ${evColor(ev)}`,
                        cursor: "pointer", overflow: "hidden",
                      }}
                    >
                      <p style={{ fontSize: 9, fontWeight: 700, color: evColor(ev), margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.target_user_id
                          ? (clientMap[ev.target_user_id] ? clientLabel(clientMap[ev.target_user_id]).split(" ")[0] : "Cliente")
                          : "Toutes"} · {ev.titre}
                      </p>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span style={{ fontSize: 9, color: "#555", fontFamily: "system-ui", paddingLeft: 4 }}>+{dayEvents.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, backgroundColor: "#111", borderRadius: 16, border: "1px solid #222", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }}>
            {/* Header modal */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>Créer un événement</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Cible */}
              <div style={{ marginBottom: 20 }}>
                <p style={lbl}>Pour qui ?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setTargetMode("all")}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `2px solid ${targetMode === "all" ? "#B22222" : "#222"}`, backgroundColor: targetMode === "all" ? "rgba(178,34,34,0.1)" : "#0D0D0D", color: targetMode === "all" ? "#F5F5F0" : "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                    Toutes les clientes
                  </button>
                  <button type="button" onClick={() => setTargetMode("specific")}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `2px solid ${targetMode === "specific" ? "#B22222" : "#222"}`, backgroundColor: targetMode === "specific" ? "rgba(178,34,34,0.1)" : "#0D0D0D", color: targetMode === "specific" ? "#F5F5F0" : "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                    Une cliente
                  </button>
                </div>
              </div>

              {/* Sélection cliente */}
              {targetMode === "specific" && (
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Rechercher une cliente</label>
                  <input
                    style={{ ...inp, marginBottom: 8 }}
                    placeholder="Nom, prénom…"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                  <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #222", backgroundColor: "#0D0D0D" }}>
                    {filteredClients.length === 0 && (
                      <p style={{ padding: "12px 14px", color: "#555", fontSize: 12, fontFamily: "system-ui", margin: 0 }}>Aucune cliente trouvée</p>
                    )}
                    {filteredClients.map(c => (
                      <div key={c.id} onClick={() => setSelectedClientId(c.id)}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1a1a1a", backgroundColor: selectedClientId === c.id ? "rgba(178,34,34,0.12)" : "transparent", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: selectedClientId === c.id ? "#B22222" : "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: selectedClientId === c.id ? "#fff" : "#555", fontFamily: "system-ui" }}>{clientLabel(c)[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: selectedClientId === c.id ? 700 : 400, color: selectedClientId === c.id ? "#F5F5F0" : "#888", margin: 0, fontFamily: "system-ui" }}>{clientLabel(c)}</p>
                          <p style={{ fontSize: 10, color: "#444", margin: 0, fontFamily: "system-ui" }}>{c.email}</p>
                        </div>
                        {selectedClientId === c.id && <span style={{ marginLeft: "auto", color: "#B22222", fontSize: 14 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Titre */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Titre *</label>
                <input style={inp} placeholder="Ex : Rendez-vous coach" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
              </div>

              {/* Date + heure */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Date *</label>
                  <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Heure</label>
                  <input type="time" style={{ ...inp, color: form.heure ? "#F5F5F0" : "#555" }} value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} />
                </div>
              </div>

              {/* Récurrence */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Récurrence</label>
                <select style={{ ...inp, cursor: "pointer" }} value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                  <option value="none">Sans récurrence</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="daily">Quotidienne</option>
                </select>
              </div>

              {/* Type d'événement */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { type: "coach",           label: "Coach",             color: "#B22222", info: teamMembers.find(m => m.role === "coach")?.nom ?? "Aucun coach configuré" },
                    { type: "nutrition",       label: "Nutrition",          color: "#22C55E", info: teamMembers.find(m => m.role === "nutrition")?.nom ?? "Aucun coach nutrition" },
                    { type: "coaching_groupe", label: "Coaching de groupe", color: "#3B82F6", info: "Lien à renseigner manuellement" },
                  ].map(({ type, label, color, info }) => {
                    const active = form.event_type === type;
                    return (
                      <button key={type} type="button" onClick={() => handleTypeChange(type)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `2px solid ${active ? color : "#222"}`, backgroundColor: active ? `${color}10` : "#0D0D0D", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: active ? color : "#888", margin: 0, fontFamily: "system-ui" }}>{label}</p>
                          <p style={{ fontSize: 10, color: "#444", margin: 0, fontFamily: "system-ui" }}>{info}{teamMembers.find(m => (type === "coach" && m.role === "coach") || (type === "nutrition" && m.role === "nutrition"))?.lien_zoom ? " · 🔗 Zoom prêt" : ""}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Message</label>
                <textarea style={{ ...inp, minHeight: 72, resize: "none" }} placeholder="Optionnel" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>

              {/* Lien */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Lien (Zoom, etc.)</label>
                <input type="url" style={inp} placeholder="https://…" value={form.lien} onChange={e => setForm(f => ({ ...f, lien: e.target.value }))} />
              </div>

              {saveError && <p style={{ fontSize: 12, color: "#F87171", margin: "0 0 12px", fontFamily: "system-ui" }}>✗ {saveError}</p>}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #222", background: "#0D0D0D", fontSize: 13, color: "#555", cursor: "pointer", fontFamily: "system-ui" }}>Annuler</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#555" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
                  {saving ? "Enregistrement…" : "✅ Créer l'événement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup détail événement */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, backgroundColor: "#111", borderRadius: 14, border: "1px solid #222", padding: "22px 24px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, backgroundColor: `${evColor(detail)}18`, border: `1px solid ${evColor(detail)}40`, fontSize: 10, fontWeight: 700, color: evColor(detail), fontFamily: "system-ui", marginBottom: 6 }}>
                  {detail.event_type === "coaching_groupe" ? "Coaching groupe" : detail.event_type === "nutrition" ? "Nutrition" : "Coach"}
                </span>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{detail.titre}</h3>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 60 }}>Date</span>
                <span style={{ fontSize: 11, color: "#F5F5F0", fontFamily: "system-ui" }}>
                  {new Date(detail.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {detail.heure ? ` à ${detail.heure.slice(0,5)}` : ""}
                </span>
              </div>
              {detail.recurrence !== "none" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 60 }}>Récurrence</span>
                  <span style={{ fontSize: 11, color: "#F5F5F0", fontFamily: "system-ui" }}>{{ weekly: "Hebdomadaire", monthly: "Mensuelle", daily: "Quotidienne" }[detail.recurrence] ?? detail.recurrence}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 60 }}>Pour</span>
                <span style={{ fontSize: 11, color: "#F5F5F0", fontFamily: "system-ui" }}>
                  {detail.target_user_id
                    ? clientMap[detail.target_user_id] ? clientLabel(clientMap[detail.target_user_id]) : "Cliente inconnue"
                    : "Toutes les clientes"}
                </span>
              </div>
              {detail.message && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 60 }}>Message</span>
                  <span style={{ fontSize: 11, color: "#888", fontFamily: "system-ui" }}>{detail.message}</span>
                </div>
              )}
              {detail.lien && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 60 }}>Lien</span>
                  <a href={detail.lien} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3B82F6", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.lien}</a>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detail.id)}
              disabled={deletingId === detail.id}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.06)", color: "#F87171", fontSize: 13, fontWeight: 600, cursor: deletingId === detail.id ? "not-allowed" : "pointer", fontFamily: "system-ui", opacity: deletingId === detail.id ? 0.5 : 1 }}
            >
              {deletingId === detail.id ? "Suppression…" : "🗑 Supprimer l'événement"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
