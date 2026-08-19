"use client";

import { useMemo } from "react";
import { COULEURS_EVENEMENT, couleurEvenement } from "@/lib/couleurs-calendrier";

type CalEvent = {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  event_type: string | null;
  target_user_id: string | null;
  target_name?: string;
  coach_team_id?: string | null;
};

type Inscription = {
  id: string;
  date: string; // YYYY-MM-DD
  nom: string;
  role: "cliente" | "coach";
};

type TeamMember = {
  id: string;
  nom: string;
  role: "coach" | "nutrition";
};

type Props = {
  events: CalEvent[];
  inscriptions: Inscription[];
  teamMembers: TeamMember[];
  weekDates: string[]; // 7 dates YYYY-MM-DD lundi→dimanche
};

// Couleur par team_member id
const COACH_COLORS: Record<string, string> = {
  "db79a24c-3cd9-4e51-a476-621b8987fcb5": "#B22222", // Mael
  "0a511090-b833-49ac-bd31-7686efbccfef": "#F97316", // Yoan
  "b7c69134-29fd-4882-afae-7e96caafa4cf": "#8B5CF6", // Emeline
  "b9dd9b84-ee78-427f-a331-d0c3562c3144": "#3B82F6", // Julie coach
  "c217e865-dc10-49a0-90aa-8b618f613274": "#10B981", // Lea nutrition
  "c357c267-f9d8-4f97-a430-d267671753fe": "#14B8A6", // Julie nutrition
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function AdminWeekCalendar({ events, inscriptions, teamMembers, weekDates }: Props) {
  const teamMap = useMemo(() => Object.fromEntries(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const byDate = useMemo(() => {
    const map: Record<string, { events: CalEvent[]; inscriptions: Inscription[] }> = {};
    for (const d of weekDates) map[d] = { events: [], inscriptions: [] };
    for (const ev of events) if (map[ev.date]) map[ev.date].events.push(ev);
    for (const ins of inscriptions) if (map[ins.date]) map[ins.date].inscriptions.push(ins);
    return map;
  }, [events, inscriptions, weekDates]);

  // Le type d'événement prime ; à défaut on retombe sur la couleur du coach.
  function eventColor(ev: CalEvent): string {
    if (ev.event_type && ev.event_type in COULEURS_EVENEMENT) {
      return couleurEvenement(ev.event_type);
    }
    if (ev.coach_team_id && COACH_COLORS[ev.coach_team_id]) return COACH_COLORS[ev.coach_team_id];
    return couleurEvenement(null);
  }

  function eventLabel(ev: CalEvent): string {
    if (ev.event_type === "coaching_groupe") return "Visio groupe";
    const coach = ev.coach_team_id ? teamMap[ev.coach_team_id] : null;
    const coachName = coach ? coach.nom.trim() : null;
    const clientName = ev.target_name ? ev.target_name.split(" ")[0] : null;
    if (coachName && clientName) return `${coachName} › ${clientName}`;
    if (coachName) return `RDV ${coachName}`;
    return ev.titre || "Événement";
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: "var(--admin-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, fontFamily: "system-ui" }}>
          Semaine en cours
        </p>
        {/* Légende */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { color: "#EF4444", label: "Inscription cliente" },
            { color: "#F97316", label: "Inscription coach" },
            { color: COULEURS_EVENEMENT.coaching_groupe.base, label: "Visio groupe" },
          ].map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--admin-text-muted)", fontFamily: "system-ui" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
          {teamMembers.filter(m => COACH_COLORS[m.id]).map(m => (
            <span key={m.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--admin-text-muted)", fontFamily: "system-ui" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COACH_COLORS[m.id], display: "inline-block" }} />
              {m.nom.trim()}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {weekDates.map((date, i) => {
          const { events: dayEvents, inscriptions: dayIns } = byDate[date] ?? { events: [], inscriptions: [] };
          const today = isToday(date);
          const total = dayEvents.length + dayIns.length;

          return (
            <div key={date} style={{
              backgroundColor: today ? "var(--admin-cal-today-bg)" : "var(--admin-cal-cell)",
              border: `1.5px solid ${today ? "#B22222" : "var(--admin-cal-border)"}`,
              borderRadius: 10, padding: "12px 10px", minHeight: 220,
              display: "flex", flexDirection: "column", gap: 5,
              boxShadow: today ? "0 0 0 1px rgba(178,34,34,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              {/* Header jour */}
              <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${today ? "rgba(178,34,34,0.15)" : "var(--admin-cal-border)"}` }}>
                <p style={{ fontSize: 10, color: today ? "#B22222" : "var(--admin-text-dim)", fontWeight: 700, margin: 0, fontFamily: "system-ui", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {JOURS[i]}
                </p>
                <p style={{ fontSize: 15, color: today ? "#B22222" : "var(--admin-cal-text)", fontWeight: today ? 800 : 500, margin: "1px 0 0", fontFamily: "system-ui" }}>
                  {formatDay(date)}
                </p>
              </div>

              {total === 0 && (
                <p style={{ fontSize: 11, color: "var(--admin-border)", margin: 0, fontFamily: "system-ui", fontStyle: "italic" }}>Rien ce jour</p>
              )}

              {/* Inscriptions */}
              {dayIns.map(ins => (
                <div key={ins.id} style={{
                  padding: "5px 8px", borderRadius: 6, fontSize: 11, fontFamily: "system-ui", fontWeight: 600,
                  backgroundColor: ins.role === "coach" ? "#FFF7ED" : "#FEF2F2",
                  color: ins.role === "coach" ? "#C2410C" : "#B91C1C",
                  borderLeft: `3px solid ${ins.role === "coach" ? "#F97316" : "#EF4444"}`,
                  lineHeight: 1.4,
                }}>
                  <span style={{ fontSize: 9, display: "block", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>
                    {ins.role === "coach" ? "Inscription coach" : "Inscription cliente"}
                  </span>
                  {ins.nom}
                </div>
              ))}

              {/* Événements */}
              {dayEvents.map(ev => {
                const color = eventColor(ev);
                return (
                  <div key={ev.id} style={{
                    padding: "5px 8px", borderRadius: 6, fontSize: 11, fontFamily: "system-ui", fontWeight: 600,
                    backgroundColor: `${color}10`,
                    color: color,
                    borderLeft: `3px solid ${color}`,
                    lineHeight: 1.4,
                    display: "flex", flexDirection: "column", gap: 2,
                  }}>
                    <span>{eventLabel(ev)}</span>
                    {ev.heure && (
                      <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 400 }}>{ev.heure.slice(0, 5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
