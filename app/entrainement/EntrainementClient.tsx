"use client";

import { useState, useMemo } from "react";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];
const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type CellItem =
  | { _key: string; type: "seance"; seanceId: string; seanceName: string; duree: number | null }
  | { _key: string; type: "seance_locale"; nom: string; duree: number | null; seanceData: unknown }
  | { _key: string; type: "video"; titre: string; url: string; categorie: string; thumb: string | null };

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

function itemNom(item: CellItem): string {
  if (item.type === "seance") return item.seanceName;
  if (item.type === "seance_locale") return item.nom;
  return item.titre;
}
function itemDuree(item: CellItem): number | null {
  if (item.type !== "video") return item.duree;
  return null;
}

// Convertit une date calendrier en clé S{s}_J{j} basée sur date_debut du programme
function dateToGridKey(date: Date, dateDebut: Date): string | null {
  const diffDays = Math.floor((date.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  const semaine = Math.floor(diffDays / 7) + 1;
  const jourSemaine = ((date.getDay() + 6) % 7) + 1; // 1=Lun, 7=Dim
  return `S${semaine}_J${jourSemaine}`;
}

// Toutes les dates du mois qui ont des séances
function buildSeanceDates(grid: Record<string, unknown[]>, dateDebut: Date, year: number, month: number): Set<string> {
  const result = new Set<string>();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const key = dateToGridKey(new Date(d), dateDebut);
    if (key && grid[key] && (grid[key] as unknown[]).length > 0) {
      result.add(d.toDateString());
    }
  }
  return result;
}

export default function EntrainementClient({ programme }: { programme: Programme | null }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [decalerMode, setDecalerMode] = useState(false);
  const [decalerFrom, setDecalerFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dateDebut = programme?.date_debut ? new Date(programme.date_debut) : null;

  const seanceDates = useMemo(() => {
    if (!programme || !dateDebut) return new Set<string>();
    return buildSeanceDates(programme.grid, dateDebut, year, month);
  }, [programme, dateDebut, year, month]);

  // Items pour un jour donné
  function getDayItems(date: Date): CellItem[] {
    if (!programme || !dateDebut) return [];
    const key = dateToGridKey(date, dateDebut);
    if (!key) return [];
    return (programme.grid[key] ?? []) as CellItem[];
  }

  const todayItems = getDayItems(today);
  const isJourDeSeance = todayItems.length > 0;
  const selectedDayItems = selectedDay ? getDayItems(selectedDay) : [];

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
      if (res.ok) {
        // Recharger la page pour voir les changements
        window.location.reload();
      }
    } finally {
      setSaving(false);
      setDecalerMode(false);
      setDecalerFrom(null);
    }
  }

  // Grille calendrier (lundi en premier)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  if (!programme) {
    return (
      <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🏋️</div>
          <h2 className="font-title" style={{ fontSize: "1.3rem", color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            AUCUN PROGRAMME ACTIF
          </h2>
          <p className="font-body" style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6, margin: 0 }}>
            Ton coach n&apos;a pas encore assigné de programme.<br />Reviens bientôt !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 16px", maxWidth: 480, margin: "0 auto" }}>

      {/* Banner séance du jour ou repos */}
      <div style={{ marginBottom: 16 }}>
        {isJourDeSeance ? (
          <div style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 16, padding: "20px 20px" }}>
            <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", margin: "0 0 6px" }}>
              {programme.nom.toUpperCase()} · SÉANCE DU JOUR
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {todayItems.filter((i) => i.type !== "video").map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                    💪
                  </div>
                  <div>
                    <p className="font-body" style={{ fontSize: "1rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      {itemNom(item)}
                    </p>
                    {itemDuree(item) && (
                      <p className="font-body" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", margin: "2px 0 0" }}>
                        {itemDuree(item)} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "20px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
              😴
            </div>
            <div>
              <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", margin: "0 0 3px" }}>
                {programme.nom.toUpperCase()}
              </p>
              <p className="font-body" style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>
                Jour de repos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mode décaler — bannière */}
      {decalerMode && (
        <div style={{ backgroundColor: "#1a1000", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="font-body" style={{ fontSize: "0.78rem", color: "#FCD34D", fontWeight: 600, margin: 0 }}>
            {saving ? "Déplacement en cours…" : "Sélectionne le nouveau jour"}
          </p>
          <button
            onClick={() => { setDecalerMode(false); setDecalerFrom(null); }}
            style={{ background: "none", border: "none", color: "#FCD34D", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Navigation mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="font-title" style={{ fontSize: "1.2rem", color: "#F5F5F0", letterSpacing: "0.06em" }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.68rem", color: "#555", fontWeight: 700, letterSpacing: "0.04em", padding: "0 0 4px" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grille calendrier — grandes cases carrées */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 16 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} style={{ aspectRatio: "1" }} />;

          const dayDate = new Date(year, month, day);
          dayDate.setHours(0, 0, 0, 0);
          const isToday = dayDate.toDateString() === today.toDateString();
          const isSelected = selectedDay?.toDateString() === dayDate.toDateString();
          const hasSeance = seanceDates.has(dayDate.toDateString());
          const isPast = dayDate < today;

          const handleClick = () => {
            if (decalerMode && hasSeance === false) {
              // Sélection du jour cible
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
                borderRadius: 10,
                border: isSelected ? "2px solid #B22222" : isToday ? "1px solid rgba(178,34,34,0.4)" : "1px solid transparent",
                backgroundColor: isToday
                  ? "rgba(178,34,34,0.1)"
                  : isSelected
                  ? "rgba(178,34,34,0.08)"
                  : hasSeance
                  ? "#151515"
                  : "transparent",
                cursor: "pointer",
                padding: 0,
                gap: 4,
              }}
            >
              <span style={{
                fontSize: "0.9rem",
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "#B22222" : isPast && !isSelected ? "#555" : "#F5F5F0",
                lineHeight: 1,
              }}>
                {day}
              </span>
              {hasSeance && (
                <span style={{
                  fontSize: "0.5rem",
                  fontWeight: 700,
                  color: isToday ? "#B22222" : "#B22222",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  opacity: 0.9,
                }}>
                  séance
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 18px" }}>
          <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 12px", textTransform: "capitalize" }}>
            {JOURS_FULL[((selectedDay.getDay() + 6) % 7)]}{" "}
            {selectedDay.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </p>

          {selectedDayItems.length === 0 ? (
            <p className="font-body" style={{ fontSize: "0.82rem", color: "#444", margin: 0, textAlign: "center", padding: "8px 0" }}>
              Jour de repos
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedDayItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#0D0D0D",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid #1a1a1a",
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: item.type === "video" ? "#0a0a1a" : "#1a0505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>
                    {item.type === "video" ? "▶" : "💪"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-body" style={{ fontWeight: 700, fontSize: "0.88rem", color: "#F5F5F0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {itemNom(item)}
                    </p>
                    {itemDuree(item) && (
                      <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", margin: "2px 0 0" }}>
                        {itemDuree(item)} min
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Bouton décaler */}
              <button
                onClick={() => {
                  const key = dateDebut ? dateToGridKey(selectedDay, dateDebut) : null;
                  if (!key) return;
                  setDecalerFrom(key);
                  setDecalerMode(true);
                  setSelectedDay(null);
                }}
                style={{
                  marginTop: 4,
                  padding: "10px",
                  backgroundColor: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: 9,
                  color: "#555",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                Décaler cette séance →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
