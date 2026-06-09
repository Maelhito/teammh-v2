"use client";

import { useState } from "react";
import Link from "next/link";

interface CalEvent {
  id: string;
  titre: string;
  heure: string | null;
  event_type: string | null;
}

interface DaySeance {
  nom: string;
  duree: number | null;
  gridKey: string;
  assignmentId: string;
  itemIndex: number;
  validated: boolean;
  isToday: boolean;
}

export interface DayData {
  dateStr: string;
  dayLabel: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  events: CalEvent[];
  seances: DaySeance[];
}

interface Props {
  weekDays: DayData[];
  seancesTotal: number;
  seancesDone: number;
}

function dotColor(eventType: string | null): string {
  if (eventType === "coaching_groupe") return "#3B82F6";
  if (eventType === "nutrition") return "#22C55E";
  return "#B22222";
}

function evtBorderColor(eventType: string | null): string {
  if (eventType === "coaching_groupe") return "#3B82F6";
  if (eventType === "nutrition") return "#22C55E";
  return "#B22222";
}

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
void JOURS_COURTS;

export default function DashboardCalendar({ weekDays, seancesTotal, seancesDone }: Props) {
  const todayIdx = weekDays.findIndex((d) => d.isToday);
  const [selectedIdx, setSelectedIdx] = useState<number>(todayIdx >= 0 ? todayIdx : 0);

  const selectedDay = weekDays[selectedIdx];
  const hasDetail = selectedDay && (selectedDay.events.length > 0 || selectedDay.seances.length > 0);

  return (
    <div style={{ padding: "0 16px 4px" }}>
      <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 16px 14px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ display: "inline-block", width: 3, height: 14, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.06em" }}>
            CETTE SEMAINE
          </span>
          {seancesTotal > 0 && (
            <span className="font-body" style={{
              marginLeft: "auto",
              fontSize: "0.65rem",
              color: seancesDone === seancesTotal ? "#4ADE80" : "#888",
            }}>
              {seancesDone}/{seancesTotal} séances {seancesDone === seancesTotal ? "✓" : ""}
            </span>
          )}
        </div>

        {/* Grille 7 jours */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {weekDays.map((day, idx) => {
            const isSelected = idx === selectedIdx;
            const hasContent = day.events.length > 0 || day.seances.length > 0;

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedIdx(idx)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 4px",
                  borderRadius: 10,
                  border: isSelected
                    ? "1px solid rgba(178,34,34,0.6)"
                    : day.isToday
                      ? "1px solid rgba(178,34,34,0.25)"
                      : "1px solid transparent",
                  backgroundColor: isSelected
                    ? "rgba(178,34,34,0.18)"
                    : day.isToday
                      ? "rgba(178,34,34,0.08)"
                      : "transparent",
                  cursor: "pointer",
                  outline: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span className="font-body" style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: isSelected || day.isToday ? "#B22222" : "#444",
                  letterSpacing: "0.04em",
                }}>
                  {day.dayLabel}
                </span>
                <span className="font-body" style={{
                  fontSize: "0.95rem",
                  fontWeight: isSelected || day.isToday ? 700 : 400,
                  color: isSelected || day.isToday ? "#B22222" : day.isPast ? "#444" : "#F5F5F0",
                  lineHeight: 1,
                }}>
                  {day.dayNum}
                </span>
                {/* Dots */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", minHeight: 8 }}>
                  {/* Séances */}
                  {day.seances.slice(0, 2).map((s, si) => (
                    <span key={`s${si}`} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      backgroundColor: "#FB923C",
                      display: "block",
                      opacity: s.validated ? 1 : 0.5,
                    }} />
                  ))}
                  {/* Événements calendrier */}
                  {hasContent && day.events.slice(0, 2).map((e) => (
                    <span key={e.id} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      backgroundColor: dotColor(e.event_type),
                      display: "block",
                    }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Panneau détail du jour sélectionné */}
        {hasDetail && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>

            {/* Séances du jour sélectionné */}
            {selectedDay.seances.map((s, i) => (
              s.isToday && !s.validated ? (
                <Link
                  key={`seance-${i}`}
                  href={`/entrainement/seance?assignmentId=${s.assignmentId}&gridKey=${s.gridKey}&itemIndex=${s.itemIndex}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px",
                    backgroundColor: "#0D0D0D",
                    borderRadius: 9,
                    borderLeft: "3px solid #FB923C",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#F5F5F0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      💪 {s.nom}
                    </p>
                    {s.duree && (
                      <p className="font-body" style={{ fontSize: "0.68rem", color: "#555", margin: "1px 0 0" }}>{s.duree} min</p>
                    )}
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#FB923C", flexShrink: 0 }}>▶ Démarrer</span>
                </Link>
              ) : (
                <div
                  key={`seance-${i}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px",
                    backgroundColor: "#0D0D0D",
                    borderRadius: 9,
                    borderLeft: s.validated ? "3px solid #4ADE80" : "3px solid #333",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 600, color: s.validated ? "#4ADE80" : "#555", margin: 0 }}>
                      {s.validated ? "✓" : "💪"} {s.nom}
                    </p>
                    {s.duree && (
                      <p className="font-body" style={{ fontSize: "0.68rem", color: "#444", margin: "1px 0 0" }}>{s.duree} min</p>
                    )}
                  </div>
                  {s.validated && (
                    <span style={{ fontSize: "0.65rem", color: "#4ADE80", fontWeight: 700 }}>Validée</span>
                  )}
                </div>
              )
            ))}

            {/* Événements calendrier */}
            {selectedDay.events.slice(0, 3).map((evt) => (
              <div key={evt.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                backgroundColor: "#0D0D0D",
                borderRadius: 9,
                borderLeft: `3px solid ${evtBorderColor(evt.event_type)}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#F5F5F0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {evt.titre}
                  </p>
                </div>
                {evt.heure && (
                  <span className="font-body" style={{ fontSize: "0.7rem", color: evtBorderColor(evt.event_type), fontWeight: 700, flexShrink: 0 }}>
                    {evt.heure.slice(0, 5)}
                  </span>
                )}
              </div>
            ))}

          </div>
        )}

        {/* Aucun événement ce jour */}
        {!hasDetail && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 9, backgroundColor: "#0D0D0D" }}>
            <p className="font-body" style={{ fontSize: "0.75rem", color: "#333", margin: 0, textAlign: "center" }}>
              Aucun événement ce jour
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
