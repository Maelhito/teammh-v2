"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  type DecodedProgramme,
  type PlannedItem,
  gridKeyFor,
  itemsForDate,
} from "@/lib/programme-planning";
import { COULEURS_EVENEMENT, COULEUR_AUJOURDHUI, couleurEvenement } from "@/lib/couleurs-calendrier";
import LegendeCalendrier from "@/components/LegendeCalendrier";
import { fuseauAppareil, occurrenceLe } from "@/lib/temps";

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

type Programme = DecodedProgramme & { semaine_courante: number };
type DayItem = PlannedItem<CellItem>;

/**
 * L'événement tombe-t-il ce jour-là, pour la personne qui regarde l'écran ?
 *
 * Toute la logique (récurrences, changement d'heure, jour qui diffère selon le
 * fuseau du lecteur) vit dans `occurrenceLe` — cette fonction n'est plus qu'un
 * adaptateur. Elle existait auparavant en cinq copies quasi identiques, chacune
 * comparant des dates murales sans fuseau.
 */
function isEventOnDay(event: CalendarEvent, day: Date, fuseauLecteur: string | null): boolean {
  return occurrenceLe(event, toLocalDate(day), fuseauLecteur).tombe;
}

// Couleurs : lib/couleurs-calendrier (source unique).
function eventColor(evt: CalendarEvent): string {
  return couleurEvenement(evt.event_type);
}

function itemNom(item: CellItem): string {
  if (item.type === "seance") return item.seanceName;
  if (item.type === "seance_locale") return item.nom;
  return item.titre;
}
function itemDuree(item: CellItem): number | null {
  return item.type !== "video" ? item.duree : null;
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EntrainementClient({
  programmes,
  initialEvents,
  abandonedKey,
  todayIso,
}: {
  programmes: Programme[];
  initialEvents: CalendarEvent[];
  /** format "assignmentId:gridKey" (ancien format : gridKey seul) */
  abandonedKey?: string | null;
  todayIso: string;
}) {
  // Anti hydration-mismatch : tant que le composant n'est pas monté côté client, on
  // dérive "aujourd'hui" des accesseurs UTC de `todayIso` (calculée côté serveur) —
  // ce qui donne les mêmes Y/M/D au premier rendu serveur ET au premier rendu client
  // (avant hydratation), quel que soit le fuseau du process Node ou du navigateur.
  // Une fois monté, un useEffect bascule sur new Date() (heure locale réelle) ; cette
  // mise à jour a lieu après l'hydratation donc n'est jamais comparée au HTML serveur.
  const [mounted, setMounted] = useState(false);
  // Le fuseau du lecteur n'existe que dans le navigateur : côté serveur, `Intl`
  // rend UTC. Tant qu'on ne l'a pas, `occurrenceLe` retombe sur la date murale
  // — même résultat qu'au rendu serveur, donc pas d'écart d'hydratation.
  useEffect(() => { setMounted(true); }, []);

  const refDate = mounted ? new Date() : new Date(`${todayIso}T00:00:00.000Z`);
  const todayY = mounted ? refDate.getFullYear() : refDate.getUTCFullYear();
  const todayM = mounted ? refDate.getMonth() : refDate.getUTCMonth();
  const todayD = mounted ? refDate.getDate() : refDate.getUTCDate();

  const today = useMemo(() => {
    const d = new Date(todayY, todayM, todayD);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [todayY, todayM, todayD]);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [decalerMode, setDecalerMode] = useState(false);
  // Décaler s'applique à une case d'un programme précis (plusieurs peuvent
  // proposer une séance le même jour).
  const [decalerFrom, setDecalerFrom] = useState<{ assignmentId: string; gridKey: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal ajout event
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ titre: "", date: toLocalDate(today), heure: "", recurrence: "none", message: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Séance abandonnée : "assignmentId:gridKey" (on tolère l'ancien format sans id)
  const abandoned = useMemo(() => {
    if (!abandonedKey) return null;
    const sep = abandonedKey.lastIndexOf(":");
    if (sep === -1) return { assignmentId: null as string | null, gridKey: abandonedKey };
    return { assignmentId: abandonedKey.slice(0, sep), gridKey: abandonedKey.slice(sep + 1) };
  }, [abandonedKey]);

  function getDayItems(date: Date): DayItem[] {
    return itemsForDate<CellItem>(programmes, date);
  }

  function getDayEvents(date: Date): CalendarEvent[] {
    return events.filter((e) => isEventOnDay(e, date, mounted ? fuseauAppareil() : null));
  }

  /** Items du jour regroupés par programme (un bandeau par programme actif). */
  function groupByProgramme(items: DayItem[]): { programme: Programme; gridKey: string; items: DayItem[] }[] {
    const groups: { programme: Programme; gridKey: string; items: DayItem[] }[] = [];
    for (const entry of items) {
      const last = groups[groups.length - 1];
      if (last && last.programme.id === entry.programme.id) last.items.push(entry);
      else groups.push({ programme: entry.programme as Programme, gridKey: entry.gridKey, items: [entry] });
    }
    return groups;
  }

  const todayItems = getDayItems(today);
  const todayGroups = groupByProgramme(todayItems.filter((e) => e.item.type !== "video"));
  /** Programmes dont la fenêtre couvre aujourd'hui (même s'ils n'ont pas de séance). */
  const programmesDuJour = programmes.filter((p) => gridKeyFor(p, today) !== null);
  const isJourDeSeance = todayGroups.length > 0;
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
    if (!decalerFrom) return;
    const prog = programmes.find((p) => p.id === decalerFrom.assignmentId);
    // La cible doit tomber dans la fenêtre du programme concerné.
    const toKey = prog ? gridKeyFor(prog, targetDate) : null;
    if (!toKey || toKey === decalerFrom.gridKey) { setDecalerMode(false); setDecalerFrom(null); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/entrainement/decaler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: decalerFrom.assignmentId, fromKey: decalerFrom.gridKey, toKey }),
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

      {/* Banner séances du jour (un bandeau par programme) / repos / pas de programme */}
      {programmes.length > 0 ? (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {isJourDeSeance ? todayGroups.map(({ programme, gridKey: todayKey, items: groupItems }) => {
            const isTerminee = programme.seancesTerminees.includes(todayKey);
            const isAbandonnee =
              !isTerminee &&
              abandoned?.gridKey === todayKey &&
              (abandoned.assignmentId === null || abandoned.assignmentId === programme.id);

            if (isTerminee) {
              // Séance terminée → carte noire compacte, en rouge et blanc uniquement
              return (
                <div key={programme.id} style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(178,34,34,0.35)", borderRadius: 12, padding: "9px 13px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, margin: "0 0 6px" }}>
                    <p className="font-body" style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {programme.nom.toUpperCase()} · SÉANCE DU JOUR
                    </p>
                    <p className="font-body" style={{ fontSize: "0.55rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: 0, flexShrink: 0 }}>
                      ✓ VALIDÉE
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {groupItems.map(({ item, itemIndex }) => (
                      <div key={itemIndex} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: "0.85rem", color: "#B22222" }}>✓</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="font-body" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFF", margin: 0 }}>{itemNom(item)}</p>
                          {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", margin: "1px 0 0" }}>{itemDuree(item)} min</p>}
                        </div>
                        <Link
                          href={`/entrainement/seance?assignmentId=${programme.id}&gridKey=${todayKey}&itemIndex=${itemIndex}`}
                          style={{ padding: "6px 11px", backgroundColor: "rgba(178,34,34,0.12)", border: "1px solid rgba(178,34,34,0.35)", borderRadius: 8, color: "#FFF", fontSize: "0.66rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                        >
                          ↺ Redémarrer
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (isAbandonnee) {
              // Séance abandonnée → carte rouge sombre + ✕
              return (
                <div key={programme.id} style={{ backgroundColor: "#120000", border: "1px solid rgba(178,34,34,0.4)", borderRadius: 14, padding: "16px 18px" }}>
                  <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(178,34,34,0.6)", letterSpacing: "0.1em", margin: "0 0 8px" }}>
                    {programme.nom.toUpperCase()} · SÉANCE ABANDONNÉE
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {groupItems.map(({ item, itemIndex }) => (
                      <div key={itemIndex} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1rem" }}>✕</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#B22222", margin: 0 }}>{itemNom(item)}</p>
                          {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.7rem", color: "rgba(178,34,34,0.45)", margin: "1px 0 0" }}>{itemDuree(item)} min</p>}
                        </div>
                        <Link
                          href={`/entrainement/seance?assignmentId=${programme.id}&gridKey=${todayKey}&itemIndex=${itemIndex}`}
                          style={{ padding: "8px 14px", backgroundColor: "rgba(178,34,34,0.1)", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 9, color: "#B22222", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                        >
                          ↺ Redémarrer
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // État normal : séance active à faire
            return (
              <div key={programme.id} style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 14, padding: "16px 18px" }}>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", margin: "0 0 8px" }}>
                  {programme.nom.toUpperCase()} · SÉANCE DU JOUR
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {groupItems.map(({ item, itemIndex }) => (
                    <div key={itemIndex} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1rem" }}>💪</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFF", margin: 0 }}>{itemNom(item)}</p>
                        {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", margin: "1px 0 0" }}>{itemDuree(item)} min</p>}
                      </div>
                      <Link
                        href={`/entrainement/seance?assignmentId=${programme.id}&gridKey=${todayKey}&itemIndex=${itemIndex}`}
                        style={{ padding: "8px 14px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9, color: "#FFF", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                      >
                        ▶ Démarrer
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          }) : (
            <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 18px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>
                📅
              </div>
              <div>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", margin: "0 0 4px" }}>
                  {(programmesDuJour.length > 0 ? programmesDuJour : programmes).map((p) => p.nom).join(" · ").toUpperCase()}
                </p>
                <p className="font-title" style={{ fontSize: "1.2rem", color: "#F5F5F0", margin: 0, letterSpacing: "0.04em" }}>REPOS</p>
                <p className="font-body" style={{ fontSize: "0.72rem", color: "#444", margin: "3px 0 0" }}>Récupération active</p>
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
            {saving
              ? "Déplacement en cours…"
              : `Sélectionne le nouveau jour${decalerFrom ? ` — ${programmes.find((p) => p.id === decalerFrom.assignmentId)?.nom ?? ""}` : ""}`}
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

      {/* Code couleur — le même que côté coach, en petit */}
      <div style={{ marginBottom: 10 }}>
        <LegendeCalendrier compact />
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
          // ✓ seulement si TOUTES les séances du jour (tous programmes) sont validées
          const isTerminee =
            hasSeance &&
            dayItems.every(({ programme, gridKey }) => programme.seancesTerminees.includes(gridKey));

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
                color: isToday ? COULEUR_AUJOURDHUI : isPast ? "#444" : "#F5F5F0",
                lineHeight: 1,
              }}>
                {day}
              </span>
              {/* Indicateurs */}
              {isTerminee ? (
                <span style={{ fontSize: "0.6rem", color: COULEURS_EVENEMENT.seance.base, lineHeight: 1 }}>✓</span>
              ) : (hasSeance || hasEvent) ? (
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  {hasSeance && <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: COULEURS_EVENEMENT.seance.base, display: "block" }} />}
                  {dayEvts.slice(0, 2).map((e) => (
                    <span key={e.id} style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: eventColor(e), display: "block" }} />
                  ))}
                </div>
              ) : null}
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
              style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#B22222", color: "#fff", border: "none", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              +
            </button>
          </div>

          {/* Séances — regroupées par programme (plusieurs peuvent tomber le même jour) */}
          {groupByProgramme(selectedDayItems).map(({ programme, gridKey, items: groupItems }) => {
            const isTerm = programme.seancesTerminees.includes(gridKey);
            return (
              <div key={programme.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: 0 }}>
                    {programme.nom.toUpperCase()}
                  </p>
                  {isTerm && (
                    <span className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: COULEURS_EVENEMENT.seance.base, letterSpacing: "0.06em" }}>✓ TERMINÉE</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {groupItems.map(({ item, itemIndex }) => (
                    <div key={itemIndex} style={{ backgroundColor: "#0D0D0D", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #1a1a1a" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.type === "video" ? "#1a1405" : "#0b1223", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>
                        {item.type === "video" ? "▶" : "💪"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-body" style={{ fontWeight: 700, fontSize: "0.86rem", color: "#F5F5F0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemNom(item)}</p>
                        {itemDuree(item) && <p className="font-body" style={{ fontSize: "0.7rem", color: "#555", margin: "2px 0 0" }}>{itemDuree(item)} min</p>}
                      </div>
                      {item.type !== "video" && (
                        <Link
                          href={`/entrainement/seance?assignmentId=${programme.id}&gridKey=${gridKey}&itemIndex=${itemIndex}`}
                          style={{ padding: "7px 12px", backgroundColor: isTerm ? "rgba(37,99,235,0.15)" : "#B22222", border: isTerm ? "1px solid rgba(37,99,235,0.4)" : "none", borderRadius: 8, color: isTerm ? COULEURS_EVENEMENT.seance.base : "#FFF", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                        >
                          {isTerm ? "↺" : "▶"}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setDecalerFrom({ assignmentId: programme.id, gridKey });
                    setDecalerMode(true);
                    setSelectedDay(null);
                  }}
                  style={{ marginTop: 8, width: "100%", padding: "9px", backgroundColor: "transparent", border: "1px solid #2a2a2a", borderRadius: 9, color: "#555", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}
                >
                  Décaler {groupItems.length > 1 ? "ces séances" : "cette séance"} →
                </button>
              </div>
            );
          })}

          {/* Événements calendrier */}
          {selectedDayEvents.length > 0 && (
            <div>
              <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#888", letterSpacing: "0.08em", margin: "0 0 8px" }}>ÉVÉNEMENTS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDayEvents.map((evt) => (
                  <div key={evt.id} style={{ backgroundColor: "#0D0D0D", borderRadius: 10, padding: "10px 14px", border: "1px solid #1a1a1a", borderLeft: `3px solid ${eventColor(evt)}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p className="font-body" style={{ fontWeight: 600, color: "#F5F5F0", fontSize: "0.86rem", margin: 0, flex: 1 }}>{evt.titre}</p>
                      {evt.heure && <span style={{ fontSize: "0.72rem", color: eventColor(evt), fontWeight: 600 }}>{evt.heure.slice(0, 5)}</span>}
                    </div>
                    {evt.message && <p className="font-body" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: "4px 0 0" }}>{evt.message}</p>}
                    {evt.lien && (
                      <a
                        href={evt.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: "0.75rem", fontWeight: 700, color: eventColor(evt), textDecoration: "none", padding: "5px 10px", backgroundColor: `${eventColor(evt)}15`, borderRadius: 7, border: `1px solid ${eventColor(evt)}40` }}
                      >
                        🔗 Accéder au lien →
                      </a>
                    )}
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
              <button type="submit" disabled={addSaving} style={{ padding: "12px", backgroundColor: "#B22222", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: addSaving ? "not-allowed" : "pointer", opacity: addSaving ? 0.6 : 1, fontSize: "0.88rem", letterSpacing: "0.05em" }}>
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
