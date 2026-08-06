"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const TIMEZONES = [
  { value: "Australia/Darwin",    label: "Darwin — UTC+9:30" },
  { value: "Australia/Brisbane",  label: "Brisbane — UTC+10" },
  { value: "Australia/Sydney",    label: "Sydney — UTC+10/+11" },
  { value: "Pacific/Noumea",      label: "Nouvelle-Calédonie — UTC+11" },
  { value: "Europe/Paris",        label: "France — UTC+1/+2" },
  { value: "Europe/London",       label: "Londres — UTC+0/+1" },
  { value: "UTC",                 label: "UTC — UTC+0" },
  { value: "America/New_York",    label: "New York — UTC-5/-4" },
  { value: "America/Los_Angeles", label: "Los Angeles — UTC-8/-7" },
  { value: "Asia/Tokyo",          label: "Tokyo — UTC+9" },
  { value: "Asia/Dubai",          label: "Dubaï — UTC+4" },
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sep.", "oct.", "nov.", "déc."];

type Client = { id: string; prenom: string; nom: string; email: string; statut: string };
type WeekEvent = {
  id: string; titre: string; date: string; heure: string | null;
  event_type: string; target_user_id: string; lien?: string | null;
  clientName: string; displayTitle: string;
};

interface Props {
  prenom: string;
  nom: string;
  today: string;
  mondayStr: string;
  activeClients: Client[];
  seancesCount: number;
  weekEvents: WeekEvent[];
  timezone: string;
  coachUserId: string | null;
}

function initials(c: Client) {
  return `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase() || "?";
}

function eventColor(type: string) {
  if (type === "coaching_groupe") return { bg: "#EDE9FE", border: "#7C3AED", text: "#5B21B6" };
  if (type === "nutrition")       return { bg: "#D1FAE5", border: "#059669", text: "#065F46" };
  return { bg: "#DBEAFE", border: "#2563EB", text: "#1E40AF" };
}

// Les heures sont saisies en heure Nouméa (Pacific/Noumea, UTC+11)
// On les convertit dans la timezone du coach
function formatHeure(h: string | null, date: string, coachTz: string) {
  if (!h) return "";
  try {
    const [hh, mm] = h.split(":");
    // Crée un Date en interprétant l'heure comme heure Nouméa
    const d = new Date(`${date}T${hh.padStart(2,"0")}:${(mm ?? "00").padStart(2,"0")}:00+11:00`);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: coachTz });
  } catch {
    return h.slice(0, 5);
  }
}

async function saveTimezone(tz: string) {
  try {
    await fetch("/api/coach/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    });
  } catch {}
}

export default function DashboardCoach({
  prenom, today, mondayStr, activeClients, seancesCount, weekEvents, timezone: initTz, coachUserId: _coachUserId,
}: Props) {
  const [timezone, setTimezone] = useState(initTz);

  function handleTimezoneChange(tz: string) {
    setTimezone(tz);
    saveTimezone(tz);
  }
  // Anti hydration-mismatch : tant que le composant n'est pas monté côté client,
  // on dérive la date à afficher des accesseurs UTC de `today` (calculée côté
  // serveur) — le texte produit est alors STRICTEMENT identique au HTML serveur,
  // quel que soit le fuseau du process Node ou du navigateur. Une fois monté, un
  // useEffect bascule sur new Date() (heure locale réelle du navigateur) ; cette
  // mise à jour a lieu APRÈS l'hydratation donc n'est jamais comparée au HTML
  // serveur et ne peut pas déclencher d'erreur.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = mounted ? new Date() : new Date(`${today}T00:00:00.000Z`);
  const y = mounted ? now.getFullYear() : now.getUTCFullYear();
  const m = mounted ? now.getMonth() : now.getUTCMonth();
  const day = mounted ? now.getDate() : now.getUTCDate();
  const dow = mounted ? now.getDay() : now.getUTCDay();

  const localISO = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  const localToday = localISO(y, m, day);

  // Lundi de la semaine courante (arithmétique pure sur année/mois/jour : pas de
  // conversion de fuseau, donc identique serveur/client tant que y/m/day/dow le sont)
  const monday = new Date(y, m, day);
  monday.setDate(day - ((dow + 6) % 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso: localISO(d.getFullYear(), d.getMonth(), d.getDate()),
      label: JOURS[i],
      labelFull: JOURS_FULL[i],
      day: d.getDate(),
      month: MOIS[d.getMonth()],
      isToday: localISO(d.getFullYear(), d.getMonth(), d.getDate()) === localToday,
    };
  });

  // Événements par jour
  const eventsByDay: Record<string, WeekEvent[]> = {};
  for (const ev of weekEvents) {
    if (!eventsByDay[ev.date]) eventsByDay[ev.date] = [];
    eventsByDay[ev.date].push(ev);
  }

  // En-tête date
  const dayLabel = JOURS_FULL[(dow + 6) % 7];
  const fullDate = `${dayLabel} ${day} ${MOIS[m]} ${y}`;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 2px", fontFamily: "system-ui" }}>
          {fullDate}
        </p>
        <h1 className="coach-dash-h1" style={{ margin: "0 0 2px" }}>
          Bonjour, {prenom} 👋
        </h1>
        <p style={{ fontSize: 14, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>
          Bienvenue dans ton espace coach Time to Move
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="coach-stats-grid">
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p className="coach-stat-num" style={{ color: "#B22222" }}>
            {activeClients.length}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui", letterSpacing: "0.02em" }}>Clientes actives</p>
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p className="coach-stat-num" style={{ color: "#3B82F6" }}>
            {seancesCount}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui", letterSpacing: "0.02em" }}>Séances clientes effectuées cette semaine</p>
        </div>
      </div>

      {/* ── Calendrier semaine — pleine largeur ── */}
      <div>
        <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>
                Calendrier de la semaine
              </h2>
              <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>
                Événements de toutes vos clientes · hors séances & tâches
              </p>
            </div>
            {/* Sélecteur timezone */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14 }}>🌏</span>
              <select
                value={timezone}
                onChange={e => handleTimezoneChange(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", fontSize: 12, color: "#1a1a1a", fontFamily: "system-ui", outline: "none", cursor: "pointer" }}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grille 7 jours — scrollable sur mobile */}
          <div className="coach-week-scroll">
            <div className="coach-week-inner">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f0f0f0" }}>
            {weekDays.map(d => (
              <div key={d.iso} style={{ padding: "10px 8px", textAlign: "center", borderRight: "1px solid #f5f5f5", backgroundColor: d.isToday ? "#FFF5F5" : "transparent" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: d.isToday ? "#B22222" : "#bbb", margin: "0 0 2px", fontFamily: "system-ui", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {d.label}
                </p>
                <p style={{ fontSize: 18, fontWeight: d.isToday ? 800 : 500, color: d.isToday ? "#B22222" : "#1a1a1a", margin: 0, fontFamily: "system-ui", lineHeight: 1 }}>
                  {d.day}
                </p>
                <p style={{ fontSize: 9, color: "#ddd", margin: "2px 0 0", fontFamily: "system-ui" }}>{d.month}</p>
              </div>
            ))}
          </div>

          {/* Événements par jour */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: 160, padding: "8px 0" }}>
            {weekDays.map(d => {
              const evs = eventsByDay[d.iso] ?? [];
              return (
                <div key={d.iso} style={{ padding: "4px 6px", borderRight: "1px solid #f8f8f8", display: "flex", flexDirection: "column", gap: 4, backgroundColor: d.isToday ? "#FFFAFA" : "transparent" }}>
                  {evs.length === 0 && (
                    <p style={{ fontSize: 10, color: "#efefef", margin: "8px 0", textAlign: "center", fontFamily: "system-ui" }}>—</p>
                  )}
                  {evs.map(ev => {
                    const c = eventColor(ev.event_type);
                    return (
                      <div key={ev.id} style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 6px" }}
                        title={`${ev.displayTitle}${ev.heure ? ` · ${formatHeure(ev.heure, ev.date, timezone)}` : ""}${ev.lien ? ` · 🔗 ${ev.lien}` : ""}`}>
                        {ev.heure && (
                          <p style={{ fontSize: 9, color: c.text, margin: "0 0 1px", fontFamily: "system-ui", fontWeight: 700 }}>
                            {formatHeure(ev.heure, ev.date, timezone)}
                          </p>
                        )}
                        <p style={{ fontSize: 10, color: c.text, margin: 0, fontFamily: "system-ui", fontWeight: 700, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                          {ev.displayTitle}
                        </p>
                        {ev.lien && (
                          <a href={ev.lien} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 9, color: c.text, opacity: 0.8, margin: "2px 0 0", display: "block", textDecoration: "none", fontFamily: "system-ui" }}
                            onClick={e => e.stopPropagation()}>
                            🔗 Rejoindre
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {weekEvents.length === 0 && (
            <p style={{ fontSize: 12, color: "#ddd", textAlign: "center", padding: "16px", fontFamily: "system-ui" }}>
              Aucun événement cette semaine
            </p>
          )}
            </div>{/* /coach-week-inner */}
          </div>{/* /coach-week-scroll */}
        </div>
      </div>

      {/* ── Mes clientes — bande compacte ── */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "12px 16px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>
            Mes clientes
          </h2>
          <Link href="/coach/clientes" style={{ fontSize: 11, color: "#B22222", textDecoration: "none", fontFamily: "system-ui" }}>Voir tout →</Link>
        </div>
        {activeClients.length === 0 ? (
          <p style={{ fontSize: 12, color: "#ccc", margin: 0, fontFamily: "system-ui" }}>Aucune cliente active</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {activeClients.map(c => (
              <Link key={c.id} href={`/coach/clientes/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 99, border: "1px solid #f0f0f0", backgroundColor: "#fafafa", textDecoration: "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f0f0f0"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#fafafa"}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#B22222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "system-ui", flexShrink: 0 }}>
                  {initials(c)}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", fontFamily: "system-ui", whiteSpace: "nowrap" }}>
                  {c.prenom} {c.nom}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
