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
  created_by: "admin" | "cliente";
  event_type: "coach" | "nutrition" | null;
  user_id: string | null;
  target_user_id: string | null;
}

interface Props {
  userId: string;
  initialEvents: CalendarEvent[];
}

function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const eventDate = new Date(event.date + "T00:00:00");
  eventDate.setHours(0, 0, 0, 0);
  if (eventDate > day) return false;

  switch (event.recurrence) {
    case "none":
      return eventDate.toDateString() === day.toDateString();
    case "daily":
      return true;
    case "weekly":
      return eventDate.getDay() === day.getDay();
    case "monthly":
      return eventDate.getDate() === day.getDate();
    default:
      return false;
  }
}

function eventColor(evt: CalendarEvent): string {
  if (evt.created_by === "cliente") return "#7C3AED";
  if (evt.event_type === "nutrition") return "#22C55E";
  return "#B22222";
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
};

export default function CalendrierClient({ userId, initialEvents }: Props) {
  void userId;
  const todayRaw = new Date();
  todayRaw.setHours(0, 0, 0, 0);

  const [year, setYear] = useState(todayRaw.getFullYear());
  const [month, setMonth] = useState(todayRaw.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    titre: "",
    date: todayRaw.toISOString().slice(0, 10),
    heure: "",
    recurrence: "none",
    message: "",
    rappel: false,
  });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleHeure, setRescheduleHeure] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function getDayEvents(day: Date) {
    return events.filter((e) => isEventOnDay(e, day));
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/calendrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, heure: form.heure || null }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setEvents((prev) => [...prev, event]);
        setShowAddModal(false);
        setForm({ titre: "", date: todayRaw.toISOString().slice(0, 10), heure: "", recurrence: "none", message: "", rappel: false });
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        setAddError(error ?? "Erreur");
      }
    } catch {
      setAddError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/calendrier?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setConfirmDeleteId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  function openReschedule(evt: CalendarEvent) {
    setRescheduleEvent(evt);
    setRescheduleDate(evt.date);
    setRescheduleHeure(evt.heure?.slice(0, 5) ?? "");
    setRescheduleError(null);
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleEvent) return;
    setRescheduleSaving(true);
    setRescheduleError(null);
    try {
      const res = await fetch("/api/calendrier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rescheduleEvent.id, date: rescheduleDate, heure: rescheduleHeure || null }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
        setRescheduleEvent(null);
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        setRescheduleError(error ?? "Erreur");
      }
    } catch {
      setRescheduleError("Erreur réseau");
    } finally {
      setRescheduleSaving(false);
    }
  }

  // Build calendar grid (Monday-first)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];

  return (
    <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto" }}>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={prevMonth} style={navBtnStyle}>←</button>
        <span className="font-title" style={{ fontSize: "1.3rem", color: "#F5F5F0", letterSpacing: "0.06em" }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>→</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
        {DAY_NAMES.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.68rem", color: "#555", fontWeight: 700, padding: "2px 0", letterSpacing: "0.04em" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dayDate = new Date(year, month, day);
          dayDate.setHours(0, 0, 0, 0);
          const isToday = dayDate.toDateString() === todayRaw.toDateString();
          const isSelected = selectedDay?.toDateString() === dayDate.toDateString();
          const dayEvts = getDayEvents(dayDate);
          const hasCoach = dayEvts.some((e) => e.created_by === "admin" && e.event_type !== "nutrition");
          const hasNutrition = dayEvts.some((e) => e.created_by === "admin" && e.event_type === "nutrition");
          const hasClient = dayEvts.some((e) => e.created_by === "cliente");

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : dayDate)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "6px 2px",
                borderRadius: 8,
                border: isSelected ? "1px solid #B22222" : "1px solid transparent",
                backgroundColor: isToday
                  ? "rgba(178,34,34,0.15)"
                  : isSelected
                  ? "rgba(178,34,34,0.08)"
                  : "transparent",
                cursor: "pointer",
                minHeight: 42,
              }}
            >
              <span style={{
                fontSize: "0.85rem",
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "#B22222" : "#F5F5F0",
                lineHeight: 1,
              }}>
                {day}
              </span>
              {(hasCoach || hasNutrition || hasClient) && (
                <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                  {hasCoach && <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#B22222" }} />}
                  {hasNutrition && <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#22C55E" }} />}
                  {hasClient && <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#7C3AED" }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 14, marginTop: 16, paddingBottom: 4, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#B22222", display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: "#555" }}>Coach</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22C55E", display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: "#555" }}>Nutrition</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#7C3AED", display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: "#555" }}>Personnel</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div style={{ marginTop: 20, padding: 16, backgroundColor: "#111111", borderRadius: 12, border: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>
              {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <button
              onClick={() => {
                setForm((f) => ({ ...f, date: selectedDay.toISOString().slice(0, 10) }));
                setShowAddModal(true);
              }}
              style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#7C3AED", color: "#fff", border: "none", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              +
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p style={{ color: "#555", fontSize: "0.82rem", textAlign: "center", margin: 0 }}>Aucun événement ce jour</p>
          ) : (
            selectedDayEvents.map((evt) => (
              <div key={evt.id} style={{
                marginBottom: 8,
                padding: "10px 12px",
                backgroundColor: "#0D0D0D",
                borderRadius: 8,
                borderLeft: `3px solid ${eventColor(evt)}`,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <p style={{ fontWeight: 600, color: "#F5F5F0", fontSize: "0.9rem", margin: 0, flex: 1 }}>
                    {evt.rappel ? "🔔 " : ""}{evt.titre}
                  </p>
                  {evt.heure && (
                    <span style={{ fontSize: "0.75rem", color: eventColor(evt), fontWeight: 600, flexShrink: 0 }}>
                      {evt.heure.slice(0, 5)}
                    </span>
                  )}
                </div>
                {evt.message && (
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", margin: "4px 0 0" }}>{evt.message}</p>
                )}
                {evt.lien && (
                  <a href={evt.lien} target="_blank" rel="noopener noreferrer" style={{ color: "#B22222", fontSize: "0.78rem", marginTop: 4, display: "block" }}>
                    → Voir le lien
                  </a>
                )}
                {evt.recurrence !== "none" && (
                  <span style={{ fontSize: "0.68rem", color: "#555", marginTop: 4, display: "block" }}>
                    {RECURRENCE_LABELS[evt.recurrence] ?? evt.recurrence}
                  </span>
                )}

                {/* Actions (personal events only) */}
                {evt.created_by === "cliente" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => openReschedule(evt)}
                      style={actionBtnStyle("#7C3AED")}
                    >
                      Reprogrammer
                    </button>
                    {confirmDeleteId === evt.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          disabled={deletingId === evt.id}
                          style={actionBtnStyle("#B22222", true)}
                        >
                          {deletingId === evt.id ? "…" : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={actionBtnStyle("#333")}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(evt.id)}
                        style={actionBtnStyle("#B22222")}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* FAB */}
      {!selectedDay && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 16px)",
            right: 20,
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: "#7C3AED",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "1.6rem",
            boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          +
        </button>
      )}

      {/* Add event modal */}
      {showAddModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            width: "100%",
            maxWidth: 480,
            margin: "0 auto",
            backgroundColor: "#111111",
            borderRadius: "16px 16px 0 0",
            padding: 24,
            paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 className="font-title" style={{ fontSize: "1.2rem", color: "#F5F5F0", margin: 0, letterSpacing: "0.06em" }}>
                NOUVEL ÉVÉNEMENT
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#555", fontSize: "1.2rem", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Nom de l'événement"
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
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
              <textarea
                placeholder="Message personnel (optionnel)"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                style={{ ...inputStyle, minHeight: 64, resize: "none" }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "2px 0" }}>
                <input
                  type="checkbox"
                  checked={form.rappel}
                  onChange={(e) => setForm((f) => ({ ...f, rappel: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "#7C3AED", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                  🔔 Rappel — notification push la veille
                </span>
              </label>
              {addError && <p style={{ color: "#F87171", fontSize: "0.82rem", margin: 0 }}>{addError}</p>}
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px",
                  backgroundColor: "#7C3AED",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontSize: "0.88rem",
                  letterSpacing: "0.05em",
                }}
              >
                {saving ? "Enregistrement..." : "AJOUTER"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setRescheduleEvent(null); }}
        >
          <div style={{
            width: "100%",
            maxWidth: 480,
            margin: "0 auto",
            backgroundColor: "#111111",
            borderRadius: "16px 16px 0 0",
            padding: 24,
            paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 className="font-title" style={{ fontSize: "1.2rem", color: "#F5F5F0", margin: 0, letterSpacing: "0.06em" }}>
                REPROGRAMMER
              </h3>
              <button onClick={() => setRescheduleEvent(null)} style={{ background: "none", border: "none", color: "#555", fontSize: "1.2rem", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: "0 0 16px" }}>
              {rescheduleEvent.titre}
            </p>
            <form onSubmit={handleReschedule} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="time"
                  value={rescheduleHeure}
                  onChange={(e) => setRescheduleHeure(e.target.value)}
                  style={{ ...inputStyle, color: rescheduleHeure ? "#F5F5F0" : "#555" }}
                />
              </div>
              {rescheduleError && <p style={{ color: "#F87171", fontSize: "0.82rem", margin: 0 }}>{rescheduleError}</p>}
              <button
                type="submit"
                disabled={rescheduleSaving}
                style={{
                  padding: "12px",
                  backgroundColor: "#7C3AED",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: rescheduleSaving ? "not-allowed" : "pointer",
                  opacity: rescheduleSaving ? 0.6 : 1,
                  fontSize: "0.88rem",
                  letterSpacing: "0.05em",
                }}
              >
                {rescheduleSaving ? "Enregistrement..." : "CONFIRMER"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#F5F5F0",
  fontSize: "1.2rem",
  cursor: "pointer",
  padding: "8px 14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: "#0D0D0D",
  border: "1px solid #222",
  borderRadius: 8,
  color: "#F5F5F0",
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

function actionBtnStyle(borderColor: string, filled = false): React.CSSProperties {
  return {
    padding: "4px 10px",
    backgroundColor: filled ? borderColor : "transparent",
    border: `1px solid ${borderColor}`,
    borderRadius: 6,
    color: filled ? "#fff" : borderColor,
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}
