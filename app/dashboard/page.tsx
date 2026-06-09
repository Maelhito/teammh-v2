import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import { getUserProfile, getModuleCompletionsWithDates } from "@/lib/user-profile";
import { computeUnlockStatuses } from "@/lib/module-unlock";
import { getStreak } from "@/lib/streak";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DashboardModules from "@/components/DashboardModules";
import PushSubscriber from "@/components/PushSubscriber";
import WelcomeVideoPopup from "@/components/WelcomeVideoPopup";
import Link from "next/link";
import TachesSection from "@/components/TachesSection";
import DashboardCalendar, { type DayData } from "@/components/DashboardCalendar";

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


interface PageProps {
  searchParams: Promise<{ locked?: string }>;
}


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

  const [profile, completionsWithDates, activeAssignment, allEventsRaw, streakInfo] = await Promise.all([
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
    userId ? getStreak(userId) : Promise.resolve({ streak_current: 0, streak_last_activity: null }),
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

  // Séances validées cette semaine (depuis seances_log)
  const seancesLogThisWeek: string[] = activeAssignment
    ? await admin
        .from("seances_log")
        .select("grid_key")
        .eq("user_id", userId)
        .eq("assignment_id", activeAssignment.id)
        .gte("created_at", monday.toISOString())
        .then((r) => (r.data ?? []).map((row) => row.grid_key as string).filter(Boolean))
    : [];

  // Séance du jour
  let seancesDuJour: { nom: string; duree: number | null; itemIndex: number }[] = [];
  let nomProgramme = "";
  let isJourDeSeance = false;
  let gridKeyDuJour: string | null = null;

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
          gridKeyDuJour = key;
          const items = grid[key] ?? [];
          seancesDuJour = items
            .filter((item) => item.type !== "video")
            .map((item, itemIndex) => ({
              nom: item.type === "seance" ? (item.seanceName ?? "") : (item.nom ?? ""),
              duree: item.duree ?? null,
              itemIndex,
            }));
          isJourDeSeance = items.some((item) => item.type !== "video");
        }
      }
    } catch {}
  }

  // Séance du jour déjà validée aujourd'hui ?
  const isTodaySeanceValidee = gridKeyDuJour ? seancesLogThisWeek.includes(gridKeyDuJour) : false;

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

  // Stat séances de la semaine courante
  let seancesPreSemaine = 0;
  let seancesTermineesSemaine = 0;
  if (activeAssignment) {
    try {
      const src = activeAssignment.grid_data ?? "";
      if (src?.startsWith("{")) {
        const parsed = JSON.parse(src);
        const grid: Record<string, { type: string }[]> = parsed.grid ?? {};
        const terminees: string[] = Array.isArray(parsed.seances_terminees) ? parsed.seances_terminees : [];
        const dateDebut = activeAssignment.date_debut ? new Date(activeAssignment.date_debut) : null;
        if (dateDebut) {
          const diffDays = Math.floor((now.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
          const semaineCourante = Math.max(Math.floor(diffDays / 7) + 1, 1);
          for (let j = 1; j <= 7; j++) {
            const key = `S${semaineCourante}_J${j}`;
            const items = grid[key] ?? [];
            const hasSeance = items.some((i) => i.type !== "video");
            if (hasSeance) {
              seancesPreSemaine++;
              if (terminees.includes(key)) seancesTermineesSemaine++;
            }
          }
        }
      }
    } catch {}
  }

  // Construction des données pour DashboardCalendar (séances par jour + validation)
  const JOURS_COURTS_CAL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const weekDaysData: DayData[] = weekDays.map(({ date, events }) => {
    // Séances de ce jour depuis grid_data
    const daySeances: DayData["seances"] = [];
    if (activeAssignment) {
      try {
        const src = activeAssignment.grid_data ?? "";
        if (src?.startsWith("{")) {
          const parsed = JSON.parse(src);
          const grid: Record<string, { type: string; seanceName?: string; nom?: string; duree?: number | null }[]> = parsed.grid ?? {};
          const dateDebut = activeAssignment.date_debut ? new Date(activeAssignment.date_debut) : null;
          if (dateDebut) {
            const diffDays = Math.floor((date.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
              const semaine = Math.floor(diffDays / 7) + 1;
              const jourIndex = date.getDay() === 0 ? 7 : date.getDay();
              const key = `S${semaine}_J${jourIndex}`;
              const items = (grid[key] ?? []).filter((i) => i.type !== "video");
              items.forEach((item, itemIndex) => {
                daySeances.push({
                  nom: item.type === "seance" ? (item.seanceName ?? "") : (item.nom ?? ""),
                  duree: item.duree ?? null,
                  gridKey: key,
                  assignmentId: activeAssignment.id,
                  itemIndex,
                  validated: seancesLogThisWeek.includes(key),
                  isToday: date.toDateString() === now.toDateString(),
                });
              });
            }
          }
        }
      } catch {}
    }
    const dayOfWeekIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return {
      dateStr: date.toISOString().slice(0, 10),
      dayLabel: JOURS_COURTS_CAL[dayOfWeekIdx],
      dayNum: date.getDate(),
      isToday: date.toDateString() === now.toDateString(),
      isPast: date < now,
      events: events.map((e) => ({ id: e.id, titre: e.titre, heure: e.heure, event_type: e.event_type })),
      seances: daySeances,
    };
  });

  const moduleItems = modules.map((m, i) => ({
    slug: m.slug,
    title: m.title,
    category: m.category,
    duration: m.duration,
    completed: completedSet.has(m.slug),
    unlock: unlockStatuses[i],
    index: i + 1,
  }));

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

        {/* Greeting + Flamme */}
        <div style={{ padding: "20px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="font-body text-sm" style={{ color: "#555" }}>
            Bonjour,{" "}
            <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{firstName}</span>
          </p>
          {streakInfo.streak_current > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "#1a0a00", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 20, padding: "5px 12px" }}>
              <span style={{ fontSize: "0.95rem" }}>🔥</span>
              <span className="font-body" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#FB923C" }}>
                {streakInfo.streak_current} jour{streakInfo.streak_current > 1 ? "s" : ""} de flamme
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 20, padding: "5px 12px" }}>
              <span style={{ fontSize: "0.85rem" }}>🔥</span>
              <span className="font-body" style={{ fontSize: "0.72rem", color: "#444" }}>Lance ta flamme !</span>
            </div>
          )}
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

        {/* Encart Jour de séance — uniquement si séance prévue aujourd'hui ET pas encore validée */}
        {activeAssignment && isJourDeSeance && !isTodaySeanceValidee && (
          <div style={{ padding: "8px 16px" }}>
            <div style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                  💪
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                    SÉANCE DU JOUR · {nomProgramme.toUpperCase()}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {seancesDuJour.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.nom}
                      </p>
                      {s.duree && (
                        <p className="font-body" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", margin: "1px 0 0" }}>
                          {s.duree} min
                        </p>
                      )}
                    </div>
                    {gridKeyDuJour && (
                      <Link
                        href={`/entrainement/seance?assignmentId=${activeAssignment.id}&gridKey=${gridKeyDuJour}&itemIndex=${s.itemIndex}`}
                        style={{ padding: "8px 14px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9, color: "#FFF", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                      >
                        ▶ Démarrer
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendrier de la semaine — composant client avec clic par jour */}
        <DashboardCalendar
          weekDays={weekDaysData}
          seancesTotal={seancesPreSemaine}
          seancesDone={seancesTermineesSemaine}
        />

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
