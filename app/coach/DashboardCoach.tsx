"use client";

import Link from "next/link";
import { useState } from "react";

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
  event_type: string; target_user_id: string; message: string | null; clientName: string;
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
  prenom, today, mondayStr, activeClients, seancesCount, weekEvents, timezone: initTz,
}: Props) {
  const [timezone, setTimezone] = useState(initTz);

  function handleTimezoneChange(tz: string) {
    setTimezone(tz);
    saveTimezone(tz);
  }
  // Construire les 7 jours de la semaine
  const monday = new Date(mondayStr + "T00:00:00");
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: JOURS[i],
      labelFull: JOURS_FULL[i],
      day: d.getDate(),
      month: MOIS[d.getMonth()],
      isToday: d.toISOString().slice(0, 10) === today,
    };
  });

  // Événements par jour
  const eventsByDay: Record<string, WeekEvent[]> = {};
  for (const ev of weekEvents) {
    if (!eventsByDay[ev.date]) eventsByDay[ev.date] = [];
    eventsByDay[ev.date].push(ev);
  }

  const todayDate = new Date(today + "T00:00:00");
  const dayLabel = JOURS_FULL[(todayDate.getDay() + 6) % 7];
  const fullDate = `${dayLabel} ${todayDate.getDate()} ${MOIS[todayDate.getMonth()]} ${todayDate.getFullYear()}`;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 2px", fontFamily: "system-ui" }}>
          {fullDate}
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui", letterSpacing: "-0.02em" }}>
          Bonjour, {prenom} 👋
        </h1>
        <p style={{ fontSize: 14, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>
          Bienvenue dans ton espace coach Time to Move
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#B22222", margin: "0 0 4px", fontFamily: "system-ui", lineHeight: 1 }}>
            {activeClients.length}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui", letterSpacing: "0.02em" }}>Clientes actives</p>
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#3B82F6", margin: "0 0 4px", fontFamily: "system-ui", lineHeight: 1 }}>
            {seancesCount}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui", letterSpacing: "0.02em" }}>Séances clientes effectuées cette semaine</p>
        </div>
      </div>

      {/* ── Corps : clientes + calendrier ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>

        {/* Colonne gauche : liste clientes */}
        <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>
              Mes clientes
            </h2>
            <Link href="/coach/clientes" style={{ fontSize: 11, color: "#B22222", textDecoration: "none", fontFamily: "system-ui" }}>Voir tout →</Link>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {activeClients.length === 0 ? (
              <p style={{ fontSize: 12, color: "#ccc", padding: "20px 16px", margin: 0, fontFamily: "system-ui" }}>Aucune cliente active</p>
            ) : activeClients.map(c => (
              <Link key={c.id} href={`/coach/clientes/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f8f8f8", textDecoration: "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#fafafa"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent"}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#B22222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "system-ui", flexShrink: 0 }}>
                  {initials(c)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.prenom} {c.nom}
                  </p>
                  <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.email}
                  </p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, backgroundColor: "#D1FAE5", color: "#065F46", fontFamily: "system-ui", flexShrink: 0 }}>
                  active
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Colonne droite : calendrier semaine */}
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

          {/* Grille 7 jours */}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: 200, padding: "8px 0" }}>
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
                      <div key={ev.id} style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 6px", cursor: "default" }}
                        title={`${ev.titre}${ev.clientName ? ` · ${ev.clientName}` : ""}${ev.heure ? ` · ${formatHeure(ev.heure, ev.date, timezone)}` : ""}`}>
                        {ev.heure && (
                          <p style={{ fontSize: 9, color: c.text, margin: "0 0 1px", fontFamily: "system-ui", fontWeight: 700 }}>
                            {formatHeure(ev.heure, ev.date, timezone)}
                          </p>
                        )}
                        <p style={{ fontSize: 10, color: c.text, margin: 0, fontFamily: "system-ui", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                          {ev.titre}
                        </p>
                        {ev.clientName && (
                          <p style={{ fontSize: 9, color: c.text, opacity: 0.7, margin: "2px 0 0", fontFamily: "system-ui" }}>
                            {ev.clientName}
                          </p>
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
        </div>
      </div>

      {/* ── Accès rapides ── */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "18px 20px", marginTop: 16 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: "0 0 14px", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>
          Accès rapides
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          {[
            { href: "/coach/clientes",   label: "Mes clientes",  icon: "👥" },
            { href: "/coach/seances",    label: "Séances",       icon: "📋" },
            { href: "/coach/programmes", label: "Programmes",    icon: "📅" },
            { href: "/coach/exercices",  label: "Exercices",     icon: "🏋️" },
          ].map(({ href, label, icon }) => (
            <a key={href} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 10px", borderRadius: 10, border: "1px solid #f0f0f0", backgroundColor: "#fafafa", textDecoration: "none", color: "#1a1a1a", fontSize: 12, fontWeight: 600, fontFamily: "system-ui", textAlign: "center", transition: "border-color 0.15s" }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
