import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import { getUserProfile, getModuleCompletionsWithDates } from "@/lib/user-profile";
import { computeUnlockStatuses, applyPhaseGate, MODULE_DEMARRAGE_SLUG } from "@/lib/module-unlock";
import { getClientPhase } from "@/lib/offers/queries";
import { getStreak } from "@/lib/streak";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DashboardModules from "@/components/DashboardModules";
import PushSubscriber from "@/components/PushSubscriber";
import WelcomeVideoPopup from "@/components/WelcomeVideoPopup";
import Link from "next/link";
import TachesSection from "@/components/TachesSection";
import DashboardCalendar, { type DayData } from "@/components/DashboardCalendar";
import PreviewBanner from "@/components/PreviewBanner";
import { getEffectiveUser } from "@/lib/preview";
import { decodeAssignments, gridKeyFor, itemsForDate, semaineCourante } from "@/lib/programme-planning";
import { estRendezVous } from "@/lib/couleurs-calendrier";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  id: string;
  titre: string;
  date: string;
  heure: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  message: string | null;
  event_type: "coach" | "nutrition" | "coaching_groupe" | "tache" | "seance" | null;
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

  const { userId, firstName, isPreview } = await getEffectiveUser(session);

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

  const [profile, completionsWithDates, activeProgrammes, allEventsRaw, streakInfo] = await Promise.all([
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getModuleCompletionsWithDates(userId) : Promise.resolve([]),
    // Plusieurs programmes peuvent être en cours simultanément.
    userId
      ? admin
          .from("client_programmes")
          .select("*, programme:programmes(nom, duree_semaines, description)")
          .eq("user_id", userId)
          .eq("statut", "en_cours")
          .order("date_debut", { ascending: true })
          .then((r) => decodeAssignments(r.data))
      : Promise.resolve([]),
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
      // Les séances viennent de la grille du programme et sont rendues à part :
      // les lignes `seance` de calendar_events feraient doublon, et prenaient
      // les places du panneau au détriment des rendez-vous.
      events: allEventsRaw
        .filter((e) => e.event_type !== "seance" && isEventOnDay(e, d))
        // Le rendez-vous d'abord, puis par heure : c'est ce que la cliente vient lire.
        .sort((a, b) => {
          const rang = (e: CalendarEvent) => (estRendezVous(e.event_type) ? 0 : 1);
          if (rang(a) !== rang(b)) return rang(a) - rang(b);
          return (a.heure ?? "99").localeCompare(b.heure ?? "99");
        }),
    };
  });

  void weekStart; void weekEndStr; // utilisés uniquement pour allEventsRaw

  // Séances validées cette semaine (depuis seances_log), tous programmes confondus.
  // Clé de dédup : "assignmentId:gridKey" — deux programmes peuvent partager un gridKey.
  const seancesLogThisWeek: Set<string> = activeProgrammes.length
    ? await admin
        .from("seances_log")
        .select("grid_key, assignment_id")
        .eq("user_id", userId)
        .gte("created_at", monday.toISOString())
        .then((r) => new Set((r.data ?? [])
          .filter((row) => row.grid_key)
          .map((row) => `${row.assignment_id}:${row.grid_key}`)))
    : new Set<string>();

  type SeanceItem = { type: string; seanceName?: string; nom?: string; duree?: number | null };

  // Séances du jour — tous programmes actifs confondus
  const seancesDuJour = itemsForDate<SeanceItem>(activeProgrammes, now)
    .filter(({ item }) => item.type !== "video")
    .map(({ programme, gridKey, itemIndex, item }) => ({
      nom: item.type === "seance" ? (item.seanceName ?? "") : (item.nom ?? ""),
      duree: item.duree ?? null,
      itemIndex,
      gridKey,
      assignmentId: programme.id,
      nomProgramme: programme.nom,
      validee: seancesLogThisWeek.has(`${programme.id}:${gridKey}`),
    }));

  // On n'affiche l'encart que pour les séances du jour pas encore validées
  const seancesDuJourAFaire = seancesDuJour.filter((s) => !s.validee);

  const completedSet = new Set(completionsWithDates.map((c) => c.module_slug));
  const completedCount = completedSet.size;

  // Phase de démarrage : en 'demarrage', seul le module de démarrage est accessible.
  const phase = userId ? await getClientPhase(admin, userId) : "demarree";
  const enDemarrage = phase === "demarrage";
  const unlockStatuses = applyPhaseGate(computeUnlockStatuses(slugs, completionsWithDates), phase);

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
  // Cumul sur tous les programmes actifs cette semaine
  let seancesPreSemaine = 0;
  let seancesTermineesSemaine = 0;
  for (const prog of activeProgrammes) {
    // Ignorer un programme qui n'a pas encore démarré ou qui est déjà fini
    if (!gridKeyFor(prog, now)) continue;
    const sem = semaineCourante(prog, now);
    for (let j = 1; j <= 7; j++) {
      const key = `S${sem}_J${j}`;
      const items = (prog.grid[key] ?? []) as { type: string }[];
      if (!items.some((i) => i.type !== "video")) continue;
      seancesPreSemaine++;
      if (prog.seancesTerminees.includes(key)) seancesTermineesSemaine++;
    }
  }

  // Construction des données pour DashboardCalendar (séances par jour + validation)
  const JOURS_COURTS_CAL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const weekDaysData: DayData[] = weekDays.map(({ date, events }) => {
    // Séances de ce jour, tous programmes actifs confondus
    const daySeances: DayData["seances"] = itemsForDate<SeanceItem>(activeProgrammes, date)
      .filter(({ item }) => item.type !== "video")
      .map(({ programme, gridKey, itemIndex, item }) => ({
        nom: item.type === "seance" ? (item.seanceName ?? "") : (item.nom ?? ""),
        duree: item.duree ?? null,
        gridKey,
        assignmentId: programme.id,
        itemIndex,
        validated: seancesLogThisWeek.has(`${programme.id}:${gridKey}`),
        isToday: date.toDateString() === now.toDateString(),
      }));
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
      {isPreview && <PreviewBanner name={firstName} />}
      <WelcomeVideoPopup userId={userId} />
      <AppHeader />
      {!isPreview && <PushSubscriber />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>

        {locked === "1" && (
          <div style={{ margin: "12px 16px 0", backgroundColor: "#1a1a1a", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 10, padding: "12px 16px" }}>
            <p className="font-body" style={{ fontSize: "0.8rem", color: "#F87171", margin: 0 }}>
              🔒 Ce module n&apos;est pas encore disponible.
            </p>
          </div>
        )}

        {/* Greeting + Flamme */}
        <div style={{ padding: "32px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(178,34,34,0.4)",
              backgroundColor: "#1a1a1a",
              backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {!profile?.avatar_url && (
                <span className="font-title" style={{ fontSize: "0.85rem", color: "#F5F5F0" }}>
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <p className="font-body text-sm" style={{ color: "#555" }}>
              Bonjour,{" "}
              <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{firstName}</span>
            </p>
          </div>
          {streakInfo.streak_current > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#1a0a00", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ fontSize: "0.85rem" }}>🔥</span>
              <span className="font-body" style={{ fontSize: "0.7rem", fontWeight: 700, color: "#FB923C" }}>
                {streakInfo.streak_current} jour{streakInfo.streak_current > 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ fontSize: "0.8rem" }}>🔥</span>
              <span className="font-body" style={{ fontSize: "0.7rem", color: "#444" }}>0j</span>
            </div>
          )}
        </div>

        {/* Bandeau phase de démarrage — la cliente doit d'abord faire son module de démarrage */}
        {enDemarrage && (
          <div style={{ padding: "8px 16px" }}>
            <Link href={`/modules/${MODULE_DEMARRAGE_SLUG}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "linear-gradient(135deg, #7C2D12 0%, #B45309 100%)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                  🚀
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                    BIENVENUE
                  </p>
                  <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF", margin: "2px 0 0" }}>
                    Fais ton module de démarrage
                  </p>
                  <p className="font-body" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "3px 0 0" }}>
                    Ton programme se débloque après ton appel de démarrage.
                  </p>
                </div>
                <span style={{ color: "#FFF", fontSize: "1.1rem", flexShrink: 0 }}>→</span>
              </div>
            </Link>
          </div>
        )}

        {/* Encart Jour de séance — uniquement si séance prévue aujourd'hui ET pas encore validée */}
        {!enDemarrage && seancesDuJourAFaire.length > 0 && (
          <div style={{ padding: "8px 16px" }}>
            <div style={{ background: "linear-gradient(135deg, #8B0000 0%, #B22222 100%)", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                  💪
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                    {seancesDuJourAFaire.length > 1 ? "SÉANCES DU JOUR" : "SÉANCE DU JOUR"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {seancesDuJourAFaire.map((s) => (
                  <div key={`${s.assignmentId}-${s.gridKey}-${s.itemIndex}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.nom}
                      </p>
                      <p className="font-body" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {[s.nomProgramme, s.duree ? `${s.duree} min` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/entrainement/seance?assignmentId=${s.assignmentId}&gridKey=${s.gridKey}&itemIndex=${s.itemIndex}`}
                      style={{ padding: "8px 14px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9, color: "#FFF", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
                    >
                      ▶ Démarrer
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CETTE SEMAINE ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 16px 10px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h2 className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.06em", margin: 0 }}>
            CETTE SEMAINE
          </h2>
          {seancesPreSemaine > 0 && (
            <span className="font-body" style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700, color: seancesTermineesSemaine === seancesPreSemaine ? "#FB923C" : "#555" }}>
              {seancesTermineesSemaine}/{seancesPreSemaine} séances {seancesTermineesSemaine === seancesPreSemaine ? "✓" : ""}
            </span>
          )}
        </div>

        <DashboardCalendar
          weekDays={weekDaysData}
          seancesTotal={seancesPreSemaine}
          seancesDone={seancesTermineesSemaine}
        />

        {/* ── TÂCHES ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 16px 10px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h2 className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.06em", margin: 0 }}>
            TÂCHES
          </h2>
        </div>

        <TachesSection />

        {/* ── MES MODULES ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 16px 10px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h2 className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.06em", margin: 0 }}>
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
