"use client";

import { useState, useMemo } from "react";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];
const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type CellItem =
  | { _key: string; type: "seance"; seanceId: string; seanceName: string; duree: number | null }
  | { _key: string; type: "seance_locale"; nom: string; duree: number | null; seanceData: unknown }
  | { _key: string; type: "video"; titre: string; url: string; categorie: string; thumb: string | null };

interface CalendarEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  message: string | null;
  lien: string | null;
  created_by: "admin" | "cliente";
  event_type: "coach" | "nutrition" | "coaching_groupe" | null;
  user_id: string | null;
  target_user_id: string | null;
}

interface Programme {
  id: string;
  nom: string;
  niveau: string;
  date_debut: string | null;
  semaine_courante: number;
  duree_semaines: number;
  note: string;
  grid: Record<string, unknown[]>;
}

function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const eventDate = new Date(event.date + "T00:00:00");
  eventDate.setHours(0, 0, 0, 0);
  if (eventDate > day) return false;
  switch (event.recurrence) {
    case "none": return eventDate.toDateString() === day.toDateString();
    case "daily": return true;
    case "weekly": return eventDate.getDay() === day.getDay();
    case "monthly": return eventDate.getDate() === day.getDate();
    default: return false;
  }
}

function eventColor(evt: CalendarEvent): string {
  if (evt.event_type === "coaching_groupe") return "#3B82F6";
  if (evt.event_type === "nutrition") return "#22C55E";
  return "#B22222";
}

function itemNom(item: CellItem): string {
  if (item.type === "seance") return item.seanceName;
  if (item.type === "seance_locale") return item.nom;
  return item.titre;
}
function itemDuree(item: CellItem): number | null {
  return item.type !== "video" ? item.duree : null;
}

function dateToGridKey(date: Date, dateDebut: Date): string | null {
  const diffDays = Math.floor((date.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  const semaine = Math.floor(diffDays / 7) + 1;
  const jourSemaine = ((date.getDay() + 6) % 7) + 1;
  return `S${semaine}_J${jourSemaine}`;
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EntrainementClient({
  programme,
  initialEvents,
}: {
  programme: Programme | null;
  initialEvents: CalendarEvent[];
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [decalerMode, setDecalerMode] = useState(false);
  const [decalerFrom, setDecalerFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal ajout event
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ titre: "", date: toLocalDate(today), heure: "", recurrence: "none", message: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const dateDebut = programme?.date_debut ? new Date(programme.date_debut) : null;

  function getDayItems(date: Date): CellItem[] {
    if (!programme || !dateDebut) return [];
    const key = dateToGridKey(date, dateDebut);
    if (!key) return [];
    return (programme.grid[key] ?? []) as CellItem[];
  }

  function getDayEvents(date: Date): CalendarEvent[] {
    return events.filter((e) => isEventOnDay(e, date));
  }

  const todayItems = getDayItems(today);
  const isJourDeSeance = todayItems.length > 0;
  const selectedDayItems = selectedDay ? getDayItems(selectedDay) : [];
  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleDecaler(targetDate: Date) {
    if (!programme || !dateDebut || !decalerFrom) return;
    const toKey = dateToGridKey(targetDate, dateDebut);
    if (!toKey || toKey === decalerFrom) { setDecalerMode(false); setDecalerFrom(null); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/entrainement/decaler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: programme.id, fromKey: decalerFrom, toKey }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setSaving(false);
      setDecalerMode(false);
      setDecalerFrom(null);
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true); setAddError(null);
    try {
      const res = await fetch("/api/calendrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, heure: addForm.heure || null, event_type: "coach" }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setEvents((prev) => [...prev, event]);
        setShowAddModal(false);
        setAddForm({ titre: "", date: toLocalDate(today), heure: "", recurrence: "none", message: "" });
      } else {
        const d = await res.json().catch(() => ({}));
        setAddError(d.error ?? "Erreur");
      }
    } catch { setAddError("Erreur réseau"); }
    finally { setAddSaving(false); }
  }

  // Grille calendrier
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ padding: "0 16px 24px", maxWidth: 480, margin: "0 auto" }}>

      {/* Banner séance du jour / repos / pas de programme */}
      {programme ? (
        <div style={{ marginBottom: 16 }}>
          {isJourDeSeance ? (
            <div style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 14, padding: "16px 18px" }}>
              <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", margin: "0 0 8px" }}>
                {programme.nom.toUpperCase()} · SÉANCE DU JOUR
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {todayItems.filter((i) => i.type !== "video").map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1rem" }}>💪</span>
                    <div>
                      <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFF", margin: 0 }}>{itemNom(item)}</p>
                      {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", margin: "1px 0 0" }}>{itemDuree(item)} min</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.3rem" }}>😴</span>
              <div>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", margin: "0 0 2px" }}>{programme.nom.toUpperCase()}</p>
                <p className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>Jour de repos</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 16, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>🏋️</span>
          <p className="font-body" style={{ fontSize: "0.8rem", color: "#555", margin: 0 }}>
            Aucun programme actif — ton coach t&apos;en assignera un bientôt.
          </p>
        </div>
      )}

      {/* Mode décaler */}
      {decalerMode && (
        <div style={{ backgroundColor: "#1a1000", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="font-body" style={{ fontSize: "0.78rem", color: "#FCD34D", fontWeight: 600, margin: 0 }}>
            {saving ? "Déplacement en cours…" : "Sélectionne le nouveau jour"}
          </p>
          <button onClick={() => { setDecalerMode(false); setDecalerFrom(null); }} style={{ background: "none", border: "none", color: "#FCD34D", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
            Annuler
          </button>
        </div>
      )}

      {/* Navigation mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="font-title" style={{ fontSize: "1.15rem", color: "#F5F5F0", letterSpacing: "0.06em" }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {DAY_NAMES.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.7rem", color: "#555", fontWeight: 700, letterSpacing: "0.04em" }}>{d}</div>
        ))}
      </div>

      {/* Grille calendrier — grandes cases */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 20 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} style={{ aspectRatio: "1" }} />;

          const dayDate = new Date(year, month, day);
          dayDate.setHours(0, 0, 0, 0);
          const isToday = dayDate.toDateString() === today.toDateString();
          const isSelected = selectedDay?.toDateString() === dayDate.toDateString();
          const dayItems = getDayItems(dayDate);
          const dayEvts = getDayEvents(dayDate);
          const hasSeance = dayItems.length > 0;
          const hasEvent = dayEvts.length > 0;
          const isPast = dayDate < today && !isToday;

          const handleClick = () => {
            if (decalerMode) {
              handleDecaler(dayDate);
              return;
            }
            setSelectedDay(isSelected ? null : dayDate);
          };

          return (
            <button
              key={day}
              onClick={handleClick}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                border: isSelected
                  ? "2px solid #B22222"
                  : isToday
                  ? "1.5px solid rgba(178,34,34,0.5)"
                  : "1.5px solid transparent",
                backgroundColor: isToday
                  ? "rgba(178,34,34,0.12)"
                  : isSelected
                  ? "rgba(178,34,34,0.1)"
                  : hasSeance
                  ? "#141414"
                  : "transparent",
                cursor: "pointer",
                padding: 2,
                gap: 3,
              }}
            >
              <span style={{
                fontSize: "0.9rem",
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "#B22222" : isPast ? "#444" : "#F5F5F0",
                lineHeight: 1,
              }}>
                {day}
              </span>
              {/* Indicateurs */}
              {(hasSeance || hasEvent) && (
                <div style={{ display: "flex", gap: 2 }}>
                  {hasSeance && <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#B22222", display: "block" }} />}
                  {hasEvent && <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#3B82F6", display: "block" }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", fontWeight: 700, letterSpacing: "0.05em", margin: 0, textTransform: "capitalize" }}>
              {JOURS_FULL[((selectedDay.getDay() + 6) % 7)]}{" "}
              {selectedDay.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </p>
            <button
              onClick={() => {
                setAddForm((f) => ({ ...f, date: toLocalDate(selectedDay) }));
                setShowAddModal(true);
              }}
              style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#7C3AED", color: "#fff", border: "none", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              +
            </button>
          </div>

          {/* Séances du programme */}
          {selectedDayItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 8px" }}>SÉANCES</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDayItems.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: "#0D0D0D", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #1a1a1a" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.type === "video" ? "#0a0a1a" : "#1a0505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>
                      {item.type === "video" ? "▶" : "💪"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-body" style={{ fontWeight: 700, fontSize: "0.86rem", color: "#F5F5F0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemNom(item)}</p>
                      {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.7rem", color: "#555", margin: "2px 0 0" }}>{itemDuree(item)} min</p>}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const key = dateDebut ? dateToGridKey(selectedDay, dateDebut) : null;
                  if (!key) return;
                  setDecalerFrom(key);
                  setDecalerMode(true);
                  setSelectedDay(null);
                }}
                style={{ marginTop: 8, width: "100%", padding: "9px", backgroundColor: "transparent", border: "1px solid #2a2a2a", borderRadius: 9, color: "#555", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}
              >
                Décaler cette séance →
              </button>
            </div>
          )}

          {/* Événements calendrier */}
          {selectedDayEvents.length > 0 && (
            <div>
              <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3B82F6", letterSpacing: "0.08em", margin: "0 0 8px" }}>ÉVÉNEMENTS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDayEvents.map((evt) => (
                  <div key={evt.id} style={{ backgroundColor: "#0D0D0D", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${eventColor(evt)}`, border: `1px solid #1a1a1a`, borderLeftColor: eventColor(evt), borderLeftWidth: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p className="font-body" style={{ fontWeight: 600, color: "#F5F5F0", fontSize: "0.86rem", margin: 0, flex: 1 }}>{evt.titre}</p>
                      {evt.heure && <span style={{ fontSize: "0.72rem", color: eventColor(evt), fontWeight: 600 }}>{evt.heure.slice(0, 5)}</span>}
                    </div>
                    {evt.message && <p className="font-body" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: "4px 0 0" }}>{evt.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayItems.length === 0 && selectedDayEvents.length === 0 && (
            <p className="font-body" style={{ fontSize: "0.82rem", color: "#444", margin: 0, textAlign: "center", padding: "8px 0" }}>
              Jour libre
            </p>
          )}
        </div>
      )}

      {/* Modal ajout événement */}
      {showAddModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", backgroundColor: "#111111", borderRadius: "16px 16px 0 0", padding: 24, paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", margin: 0, letterSpacing: "0.06em" }}>AJOUTER UN ÉVÉNEMENT</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#555", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Nom de l'événement" required value={addForm.titre} onChange={(e) => setAddForm((f) => ({ ...f, titre: e.target.value }))} style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input type="date" required value={addForm.date} onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
                <input type="time" value={addForm.heure} onChange={(e) => setAddForm((f) => ({ ...f, heure: e.target.value }))} style={inputStyle} />
              </div>
              <select value={addForm.recurrence} onChange={(e) => setAddForm((f) => ({ ...f, recurrence: e.target.value }))} style={inputStyle}>
                <option value="none">Sans récurrence</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
              <textarea placeholder="Note (optionnel)" value={addForm.message} onChange={(e) => setAddForm((f) => ({ ...f, message: e.target.value }))} style={{ ...inputStyle, minHeight: 56, resize: "none" }} />
              {addError && <p style={{ color: "#F87171", fontSize: "0.8rem", margin: 0 }}>{addError}</p>}
              <button type="submit" disabled={addSaving} style={{ padding: "12px", backgroundColor: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: addSaving ? "not-allowed" : "pointer", opacity: addSaving ? 0.6 : 1, fontSize: "0.88rem", letterSpacing: "0.05em" }}>
                {addSaving ? "Enregistrement…" : "AJOUTER"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
