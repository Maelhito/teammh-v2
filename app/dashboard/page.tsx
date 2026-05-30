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

export const dynamic = "force-dynamic";

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

  // Dates pour les tâches de la semaine
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const weekStart = startOfWeek.toISOString().slice(0, 10);
  const weekEnd = endOfWeek.toISOString().slice(0, 10);

  const [profile, completionsWithDates, activeAssignment, tachesResult] = await Promise.all([
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
          .select("id, titre, message, heure, event_type")
          .or(`target_user_id.eq.${userId},target_user_id.is.null`)
          .gte("date", weekStart)
          .lte("date", weekEnd)
          .order("date", { ascending: true })
          .limit(5)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  const taches = tachesResult as { id: string; titre: string; message: string | null; heure: string | null; event_type: string | null }[];

  // Séance du jour depuis le programme actif
  let seancesDuJour: { nom: string; duree: number | null }[] = [];
  let nomProgramme = "";
  let isJourDeSeance = false;

  if (activeAssignment) {
    nomProgramme = activeAssignment.programme?.nom ?? "";
    try {
      const src = activeAssignment.grid_data ?? "";
      if (src?.startsWith("{")) {
        const parsed = JSON.parse(src);
        const grid: Record<string, { type: string; seanceName?: string; nom?: string; titre?: string; duree?: number | null }[]> = parsed.grid ?? {};
        const dateDebut = activeAssignment.date_debut ? new Date(activeAssignment.date_debut) : null;
        if (dateDebut) {
          const diffDays = Math.floor((Date.now() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
          const semaine = Math.max(Math.floor(diffDays / 7) + 1, 1);
          const dayOfWeek = now.getDay();
          const jourIndex = dayOfWeek === 0 ? 7 : dayOfWeek;
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

        {/* Encart Jour de séance / Jour de repos */}
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
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: isJourDeSeance ? "rgba(0,0,0,0.25)" : "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    flexShrink: 0,
                  }}
                >
                  {isJourDeSeance ? "💪" : "😴"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="font-body"
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: isJourDeSeance ? "rgba(255,255,255,0.6)" : "#555",
                      letterSpacing: "0.08em",
                      margin: "0 0 3px",
                    }}
                  >
                    {isJourDeSeance ? `SÉANCE DU JOUR · ${nomProgramme.toUpperCase()}` : "PROGRAMME"}
                  </p>
                  {isJourDeSeance ? (
                    seancesDuJour.map((s, i) => (
                      <p
                        key={i}
                        className="font-body"
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#FFFFFF",
                          margin: i === 0 ? 0 : "2px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.nom}{s.duree ? ` · ${s.duree} min` : ""}
                      </p>
                    ))
                  ) : (
                    <p className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>
                      Jour de repos
                    </p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isJourDeSeance ? "rgba(255,255,255,0.5)" : "#333"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Encart tâches de la semaine */}
        <div style={{ padding: "0 16px 4px" }}>
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ display: "inline-block", width: 3, height: 14, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.06em" }}>
                TÂCHES DE LA SEMAINE
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const tache = taches[i];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1.5px solid ${tache ? "#B22222" : "#2a2a2a"}`,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                    {tache ? (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-body" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F5F5F0", margin: 0, lineHeight: 1.3 }}>
                          {tache.titre}
                        </p>
                        {tache.message && (
                          <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", margin: "2px 0 0", lineHeight: 1.4 }}>
                            {tache.message}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a", marginTop: 9 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section modules */}
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
