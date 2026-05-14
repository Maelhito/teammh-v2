"use client";

import { useState } from "react";

interface CalendarEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  message: string | null;
  lien: string | null;
  rappel: boolean;
  rappel_minutes?: number;
  created_by: "admin" | "cliente";
  event_type: "coach" | "nutrition" | "coaching_groupe" | null;
  user_id: string | null;
  target_user_id: string | null;
}

interface Programme {
  id: string;
  nom: string;
  duree_semaines: number;
}

interface Props {
  clientId: string;
  initialEvents: CalendarEvent[];
  initialProgrammes: Programme[];
}

const MONTH_NAMES = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAY_NAMES = ["L","M","M","J","V","S","D"];

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isEventOnDay(ev: CalendarEvent, day: Date): boolean {
  const evDate = new Date(ev.date + "T00:00:00");
  evDate.setHours(0,0,0,0);
  if (evDate > day) return false;
  switch (ev.recurrence) {
    case "none":    return evDate.toDateString() === day.toDateString();
    case "daily":   return true;
    case "weekly":  return evDate.getDay() === day.getDay();
    case "monthly": return evDate.getDate() === day.getDate();
    default:        return false;
  }
}

function eventColor(ev: CalendarEvent): string {
  if (ev.event_type === "coaching_groupe") return "#3B82F6";
  if (ev.event_type === "nutrition") return "#22C55E";
  if (ev.created_by === "cliente") return "#7C3AED";
  return "#B22222";
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", backgroundColor: "#fff",
  border: "1px solid #ddd", borderRadius: 8, color: "#1a1a1a",
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "system-ui",
};

type Tab = "evenement" | "programme" | "tache";

export default function CalendrierCoach({ clientId, initialEvents, initialProgrammes }: Props) {
  const today = new Date();
  today.setHours(0,0,0,0);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<Tab>("evenement");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Event form
  const [evForm, setEvForm] = useState({
    titre: "", date: toLocalDate(today), heure: "",
    recurrence: "none", message: "", lien: "",
    rappel: false, rappel_minutes: 0, event_type: "coach",
  });

  // Programme form
  const [progForm, setProgForm] = useState({ programme_id: "", date_debut: toLocalDate(today) });

  // Tâche form
  const [tacheForm, setTacheForm] = useState({ titre: "", date: toLocalDate(today), description: "" });

  function openModal(day?: Date) {
    const d = day ?? selectedDay ?? today;
    const dateStr = toLocalDate(d);
    setEvForm(f => ({ ...f, date: dateStr }));
    setProgForm(f => ({ ...f, date_debut: dateStr }));
    setTacheForm(f => ({ ...f, date: dateStr }));
    setSaveError(null);
    setShowModal(true);
  }

  // ─── Calendar grid ──────────────────────────────────────────────────────────
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const selectedDayEvents = selectedDay
    ? events.filter(ev => isEventOnDay(ev, selectedDay))
    : [];

  // ─── Save handlers ───────────────────────────────────────────────────────────
  async function saveEvenement() {
    if (!evForm.titre || !evForm.date) { setSaveError("Titre et date requis"); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clientId}/evenements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...evForm, heure: evForm.heure || null }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setEvents(prev => [...prev, event]);
        setShowModal(false);
        setEvForm(f => ({ ...f, titre: "", message: "", lien: "" }));
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur" }));
        setSaveError(error ?? "Erreur");
      }
    } catch { setSaveError("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function saveProgramme() {
    if (!progForm.programme_id || !progForm.date_debut) { setSaveError("Sélectionne un programme et une date"); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clientId}/evenements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "programme", ...progForm }),
      });
      if (res.ok) {
        const { events: newEvents } = await res.json();
        setEvents(prev => [...prev, ...(newEvents ?? [])]);
        setShowModal(false);
        setProgForm(f => ({ ...f, programme_id: "" }));
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur" }));
        setSaveError(error ?? "Erreur");
      }
    } catch { setSaveError("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function saveTache() {
    if (!tacheForm.titre || !tacheForm.date) { setSaveError("Titre et date requis"); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clientId}/evenements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: tacheForm.titre, date: tacheForm.date,
          message: tacheForm.description || null,
          heure: null, recurrence: "none", lien: null,
          rappel: false, rappel_minutes: 0, event_type: "coach",
        }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setEvents(prev => [...prev, event]);
        setShowModal(false);
        setTacheForm(f => ({ ...f, titre: "", description: "" }));
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur" }));
        setSaveError(error ?? "Erreur");
      }
    } catch { setSaveError("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function deleteEvent(eventId: string) {
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/coach/clientes/${clientId}/evenements?event_id=${eventId}`, { method: "DELETE" });
      if (res.ok) setEvents(prev => prev.filter(e => e.id !== eventId));
    } finally { setDeletingId(null); }
  }

  function handleSave() {
    if (tab === "evenement") saveEvenement();
    else if (tab === "programme") saveProgramme();
    else saveTache();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

      {/* ── Calendar ── */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prevMonth} style={navBtn}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", fontFamily: "system-ui" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>→</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
          {DAY_NAMES.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#aaa", fontWeight: 600, fontFamily: "system-ui", padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const isToday = day.toDateString() === today.toDateString();
            const isSelected = selectedDay?.toDateString() === day.toDateString();
            const dayEvs = events.filter(ev => isEventOnDay(ev, day));
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                style={{
                  borderRadius: 8, padding: "6px 4px", cursor: "pointer", textAlign: "center",
                  backgroundColor: isSelected ? "#B22222" : isToday ? "#FEF2F2" : "transparent",
                  border: isSelected ? "none" : isToday ? "1px solid #FECACA" : "1px solid transparent",
                  transition: "background 0.1s",
                  minHeight: 44,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? "#fff" : isToday ? "#B22222" : "#1a1a1a", fontFamily: "system-ui", display: "block", marginBottom: 3 }}>
                  {day.getDate()}
                </span>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                  {dayEvs.slice(0, 3).map((ev, j) => (
                    <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : eventColor(ev), display: "inline-block" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day panel ── */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", fontFamily: "system-ui" }}>
            {selectedDay
              ? selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
              : "Sélectionne un jour"}
          </span>
          <button
            onClick={() => openModal(selectedDay ?? undefined)}
            style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#B22222", border: "none", color: "#fff", fontSize: 20, lineHeight: "32px", cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Ajouter"
          >
            +
          </button>
        </div>

        {!selectedDay && (
          <p style={{ color: "#aaa", fontSize: 13, fontFamily: "system-ui", textAlign: "center", margin: "24px 0" }}>
            Clique sur un jour pour voir ses événements
          </p>
        )}

        {selectedDay && selectedDayEvents.length === 0 && (
          <p style={{ color: "#aaa", fontSize: 13, fontFamily: "system-ui", textAlign: "center", margin: "24px 0" }}>
            Aucun événement ce jour
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedDayEvents.map(ev => (
            <div key={ev.id} style={{ padding: "10px 12px", borderRadius: 10, backgroundColor: "#fafafa", border: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: eventColor(ev), flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.titre}
                    </span>
                  </div>
                  {ev.heure && (
                    <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0", fontFamily: "system-ui" }}>
                      {ev.heure.slice(0,5)}
                    </p>
                  )}
                  {ev.message && (
                    <p style={{ fontSize: 11, color: "#666", margin: "4px 0 0", fontFamily: "system-ui", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {ev.message}
                    </p>
                  )}
                  {ev.recurrence !== "none" && (
                    <p style={{ fontSize: 10, color: "#aaa", margin: "3px 0 0", fontFamily: "system-ui" }}>
                      {{ daily:"Quotidien", weekly:"Hebdomadaire", monthly:"Mensuel" }[ev.recurrence]}
                    </p>
                  )}
                </div>
                {ev.created_by === "admin" && (
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    disabled={deletingId === ev.id}
                    style={{ padding: "3px 8px", border: "1px solid #e0e0e0", borderRadius: 6, background: "transparent", color: "#aaa", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                    title="Supprimer"
                  >
                    {deletingId === ev.id ? "…" : "✕"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add modal ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>Ajouter</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: 20, gap: 0 }}>
              {(["evenement", "programme", "tache"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "8px 4px", background: "none",
                    border: "none", borderBottom: tab === t ? "2px solid #B22222" : "2px solid transparent",
                    color: tab === t ? "#B22222" : "#888",
                    fontWeight: tab === t ? 700 : 400, fontSize: 12,
                    cursor: "pointer", fontFamily: "system-ui", letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {t === "evenement" ? "Événement" : t === "programme" ? "Programme" : "Tâche"}
                </button>
              ))}
            </div>

            {/* ── Événement tab ── */}
            {tab === "evenement" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="text" placeholder="Titre de l'événement *" value={evForm.titre}
                  onChange={e => setEvForm(f => ({ ...f, titre: e.target.value }))} style={inp} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="date" value={evForm.date}
                    onChange={e => setEvForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                  <input type="time" value={evForm.heure}
                    onChange={e => setEvForm(f => ({ ...f, heure: e.target.value }))} style={{ ...inp, color: evForm.heure ? "#1a1a1a" : "#aaa" }} />
                </div>
                <select value={evForm.recurrence} onChange={e => setEvForm(f => ({ ...f, recurrence: e.target.value }))} style={inp}>
                  <option value="none">Sans récurrence</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="daily">Quotidienne</option>
                </select>
                <select value={evForm.event_type} onChange={e => setEvForm(f => ({ ...f, event_type: e.target.value }))} style={inp}>
                  <option value="coach">🔴 Coach</option>
                  <option value="nutrition">🟢 Nutrition</option>
                  <option value="coaching_groupe">🔵 Coaching de groupe</option>
                </select>
                <textarea placeholder="Message (optionnel)" value={evForm.message}
                  onChange={e => setEvForm(f => ({ ...f, message: e.target.value }))}
                  style={{ ...inp, minHeight: 80, resize: "none" }} />
                <input type="url" placeholder="Lien (ex: zoom)" value={evForm.lien}
                  onChange={e => setEvForm(f => ({ ...f, lien: e.target.value }))} style={inp} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={evForm.rappel}
                    onChange={e => setEvForm(f => ({ ...f, rappel: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "#B22222" }} />
                  <span style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>🔔 Rappel push la veille</span>
                </label>
                <select value={evForm.rappel_minutes} onChange={e => setEvForm(f => ({ ...f, rappel_minutes: Number(e.target.value) }))} style={inp}>
                  <option value={0}>Pas de rappel avant l'heure</option>
                  <option value={30}>30 min avant</option>
                  <option value={60}>1h avant</option>
                </select>
              </div>
            )}

            {/* ── Programme tab ── */}
            {tab === "programme" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px", fontFamily: "system-ui" }}>
                  Assigne un programme — chaque séance sera ajoutée au calendrier de ta cliente.
                </p>
                {initialProgrammes.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#aaa", fontFamily: "system-ui", textAlign: "center", padding: "20px 0" }}>
                    Aucun programme disponible. Crée d'abord un programme dans l'espace Programmes.
                  </p>
                ) : (
                  <select value={progForm.programme_id} onChange={e => setProgForm(f => ({ ...f, programme_id: e.target.value }))} style={inp}>
                    <option value="">Choisir un programme…</option>
                    {initialProgrammes.map(p => (
                      <option key={p.id} value={p.id}>{p.nom} ({p.duree_semaines} sem.)</option>
                    ))}
                  </select>
                )}
                <div>
                  <label style={{ fontSize: 12, color: "#888", fontFamily: "system-ui", display: "block", marginBottom: 4 }}>Date de début (Jour 1 = Lundi de la 1ère semaine)</label>
                  <input type="date" value={progForm.date_debut}
                    onChange={e => setProgForm(f => ({ ...f, date_debut: e.target.value }))} style={inp} />
                </div>
              </div>
            )}

            {/* ── Tâche tab ── */}
            {tab === "tache" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="text" placeholder="Titre de la tâche *" value={tacheForm.titre}
                  onChange={e => setTacheForm(f => ({ ...f, titre: e.target.value }))} style={inp} />
                <input type="date" value={tacheForm.date}
                  onChange={e => setTacheForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                <textarea placeholder="Description (optionnel)" value={tacheForm.description}
                  onChange={e => setTacheForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inp, minHeight: 100, resize: "none" }} />
              </div>
            )}

            {saveError && (
              <p style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui", margin: "10px 0 0" }}>✗ {saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: 16, width: "100%", padding: "11px", backgroundColor: "#B22222", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "system-ui", letterSpacing: "0.04em" }}
            >
              {saving ? "Enregistrement…" : tab === "programme" ? "ASSIGNER LE PROGRAMME" : tab === "tache" ? "AJOUTER LA TÂCHE" : "CRÉER L'ÉVÉNEMENT"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none", border: "1px solid #e8e8e8", borderRadius: 8,
  padding: "4px 12px", cursor: "pointer", color: "#555", fontSize: 16,
  fontFamily: "system-ui",
};
