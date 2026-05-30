import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import { getUserProfile, getModuleCompletionsWithDates } from "@/lib/user-profile";
import { computeUnlockStatuses } from "@/lib/module-unlock";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DashboardModules from "@/components/DashboardModules";
import PushSubscriber from "@/components/PushSubscriber";
import WelcomeVideoPopup from "@/components/WelcomeVideoPopup";
import Link from "next/link";
import TachesSection from "@/components/TachesSection";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  message: string | null;
  event_type: "coach" | "nutrition" | "coaching_groupe" | null;
  target_user_id: string | null;
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

function eventDotColor(evt: CalendarEvent): string {
  if (evt.event_type === "coaching_groupe") return "#3B82F6";
  if (evt.event_type === "nutrition") return "#22C55E";
  return "#B22222";
}

interface PageProps {
  searchParams: Promise<{ locked?: string }>;
}

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default async function DashboardPage({ searchParams }: PageProps) {
  const { locked } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const userId = session?.user.id ?? "";
  const firstName = session?.user.user_metadata?.prenom
    ?? session?.user.email?.split("@")[0]
    ?? "";

  const modules = getModules();
  const slugs = modules.map((m) => m.slug);
  const admin = createSupabaseAdminClient();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Lundi de la semaine courante
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [profile, completionsWithDates, activeAssignment, allEventsRaw] = await Promise.all([
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getModuleCompletionsWithDates(userId) : Promise.resolve([]),
    userId
      ? admin
          .from("client_programmes")
          .select("*, programme:programmes(nom)")
          .eq("user_id", userId)
          .eq("statut", "en_cours")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
    userId
      ? admin
          .from("calendar_events")
          .select("id, titre, date, heure, recurrence, message, event_type, target_user_id")
          .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
          .lte("date", weekEndStr)
          .order("date", { ascending: true })
          .then((r) => (r.data ?? []) as CalendarEvent[])
      : Promise.resolve([] as CalendarEvent[]),
  ]);

  // Événements de la semaine (un-time + récurrents)
  const weekDays: { date: Date; dayIndex: number; events: CalendarEvent[] }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d,
      dayIndex: i,
      events: allEventsRaw.filter((e) => isEventOnDay(e, d)),
    };
  });

  void weekStart; void weekEndStr; // utilisés uniquement pour allEventsRaw

  // Séance du jour
  let seancesDuJour: { nom: string; duree: number | null }[] = [];
  let nomProgramme = "";
  let isJourDeSeance = false;

  if (activeAssignment) {
    nomProgramme = activeAssignment.programme?.nom ?? "";
    try {
      const src = activeAssignment.grid_data ?? "";
      if (src?.startsWith("{")) {
        const parsed = JSON.parse(src);
        const grid: Record<string, { type: string; seanceName?: string; nom?: string; duree?: number | null }[]> = parsed.grid ?? {};
        const dateDebut = activeAssignment.date_debut ? new Date(activeAssignment.date_debut) : null;
        if (dateDebut) {
          const diffDays = Math.floor((now.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
          const semaine = Math.max(Math.floor(diffDays / 7) + 1, 1);
          const jourIndex = now.getDay() === 0 ? 7 : now.getDay();
          const key = `S${semaine}_J${jourIndex}`;
          const items = grid[key] ?? [];
          seancesDuJour = items
            .filter((item) => item.type !== "video")
            .map((item) => ({
              nom: item.type === "seance" ? (item.seanceName ?? "") : (item.nom ?? ""),
              duree: item.duree ?? null,
            }));
          isJourDeSeance = items.length > 0;
        }
      }
    } catch {}
  }

  const completedSet = new Set(completionsWithDates.map((c) => c.module_slug));
  const completedCount = completedSet.size;
  const unlockStatuses = computeUnlockStatuses(slugs, completionsWithDates);

  const PROGRAMME_CFG: Record<string, { weeks: number }> = {
    "16_semaines": { weeks: 16 },
    "6_mois":      { weeks: 26 },
    "12_mois":     { weeks: 52 },
  };
  const dureeKey =
    profile?.programme_type === "N2" && profile?.programme_duree
      ? profile.programme_duree
      : "16_semaines";
  const cfg = PROGRAMME_CFG[dureeKey] ?? PROGRAMME_CFG["16_semaines"];

  let semaineLabel = "";
  let semaineProgress = 0;
  if (profile?.date_demarrage) {
    const start = new Date(profile.date_demarrage);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const semaine = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), cfg.weeks);
    semaineLabel = `Semaine ${semaine} / ${cfg.weeks}`;
    semaineProgress = semaine / cfg.weeks;
  }

  const moduleItems = modules.map((m, i) => ({
    slug: m.slug,
    title: m.title,
    category: m.category,
    duration: m.duration,
    completed: completedSet.has(m.slug),
    unlock: unlockStatuses[i],
    index: i + 1,
  }));

  const todayStr = now.toDateString();

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <WelcomeVideoPopup userId={userId} />
      <AppHeader />
      <PushSubscriber />

      <div className="mx-auto" style={{ maxWidth: 480 }}>

        {locked === "1" && (
          <div style={{ margin: "12px 16px 0", backgroundColor: "#1a1a1a", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 10, padding: "12px 16px" }}>
            <p className="font-body" style={{ fontSize: "0.8rem", color: "#F87171", margin: 0 }}>
              🔒 Ce module n&apos;est pas encore disponible.
            </p>
          </div>
        )}

        {/* Greeting */}
        <div style={{ padding: "20px 16px 8px" }}>
          <p className="font-body text-sm" style={{ color: "#555" }}>
            Bonjour,{" "}
            <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{firstName}</span>
          </p>
        </div>

        {/* Barre de progression semaine */}
        {semaineLabel && (
          <div style={{ padding: "4px 16px" }}>
            <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="font-body" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.04em" }}>
                  {semaineLabel}
                </span>
                <span className="font-body" style={{ fontSize: "0.72rem", color: "#555" }}>
                  {completedCount}/{modules.length} modules
                </span>
              </div>
              <div style={{ height: 5, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${semaineProgress * 100}%`, backgroundColor: "#B22222", borderRadius: 3 }} />
              </div>
            </div>
          </div>
        )}

        {/* Encart Jour de séance / Repos */}
        {activeAssignment && (
          <div style={{ padding: "8px 16px" }}>
            <Link href="/entrainement" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: isJourDeSeance
                    ? "linear-gradient(135deg, #8B0000 0%, #B22222 100%)"
                    : "#111111",
                  border: isJourDeSeance ? "none" : "1px solid #1a1a1a",
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isJourDeSeance ? "rgba(0,0,0,0.25)" : "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                  {isJourDeSeance ? "💪" : "😴"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: isJourDeSeance ? "rgba(255,255,255,0.6)" : "#555", letterSpacing: "0.08em", margin: "0 0 3px" }}>
                    {isJourDeSeance ? `SÉANCE DU JOUR · ${nomProgramme.toUpperCase()}` : "PROGRAMME"}
                  </p>
                  {isJourDeSeance ? (
                    seancesDuJour.map((s, i) => (
                      <p key={i} className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#FFFFFF", margin: i === 0 ? 0 : "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.nom}{s.duree ? ` · ${s.duree} min` : ""}
                      </p>
                    ))
                  ) : (
                    <p className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>Jour de repos</p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isJourDeSeance ? "rgba(255,255,255,0.5)" : "#333"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Calendrier de la semaine */}
        <div style={{ padding: "0 16px 4px" }}>
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 3, height: 14, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.06em" }}>
                CETTE SEMAINE
              </span>
            </div>

            {/* 7 colonnes jours */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {weekDays.map(({ date, events: dayEvts }) => {
                const isToday = date.toDateString() === todayStr;
                const isPast = date < now;
                const hasEvts = dayEvts.length > 0;

                return (
                  <Link key={date.toISOString()} href="/entrainement" style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 4px",
                        borderRadius: 10,
                        backgroundColor: isToday ? "rgba(178,34,34,0.15)" : "transparent",
                        border: isToday ? "1px solid rgba(178,34,34,0.35)" : "1px solid transparent",
                      }}
                    >
                      <span className="font-body" style={{ fontSize: "0.6rem", fontWeight: 700, color: isToday ? "#B22222" : "#444", letterSpacing: "0.04em" }}>
                        {JOURS_COURTS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                      </span>
                      <span className="font-body" style={{ fontSize: "0.95rem", fontWeight: isToday ? 700 : 400, color: isToday ? "#B22222" : isPast ? "#444" : "#F5F5F0", lineHeight: 1 }}>
                        {date.getDate()}
                      </span>
                      {/* Dots événements */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", minHeight: 8 }}>
                        {hasEvts && dayEvts.slice(0, 3).map((evt) => (
                          <span key={evt.id} style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: eventDotColor(evt), display: "block" }} />
                        ))}
                        {dayEvts.length > 3 && (
                          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#555", display: "block" }} />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Événements du jour courant sous le calendrier */}
            {weekDays[now.getDay() === 0 ? 6 : now.getDay() - 1]?.events.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {weekDays[now.getDay() === 0 ? 6 : now.getDay() - 1].events.slice(0, 3).map((evt) => (
                  <div key={evt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", backgroundColor: "#0D0D0D", borderRadius: 8, borderLeft: `3px solid ${eventDotColor(evt)}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#F5F5F0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{evt.titre}</p>
                    </div>
                    {evt.heure && <span className="font-body" style={{ fontSize: "0.7rem", color: eventDotColor(evt), fontWeight: 700, flexShrink: 0 }}>{evt.heure.slice(0, 5)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tâches de la semaine — composant client avec checkboxes */}
        <TachesSection />

        {/* Modules */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 12px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h2 className="font-title" style={{ fontSize: "1.45rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em" }}>
            MES MODULES
          </h2>
          <span className="font-body" style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#555" }}>
            {modules.length} module{modules.length > 1 ? "s" : ""}
          </span>
        </div>

        <DashboardModules items={moduleItems} />

      </div>

      <BottomNav />
    </div>
  );
}
