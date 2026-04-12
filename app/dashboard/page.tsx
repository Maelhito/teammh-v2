import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getModules } from "@/lib/modules";
import { getUserProfile, getModuleCompletionsWithDates } from "@/lib/user-profile";
import { computeUnlockStatuses } from "@/lib/module-unlock";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DashboardModules from "@/components/DashboardModules";
import PushSubscriber from "@/components/PushSubscriber";

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

  const [profile, completionsWithDates] = await Promise.all([
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getModuleCompletionsWithDates(userId) : Promise.resolve([]),
  ]);

  const completedSet = new Set(completionsWithDates.map((c) => c.module_slug));
  const completedCount = completedSet.size;
  const unlockStatuses = computeUnlockStatuses(slugs, completionsWithDates);

  // Durées par type de programme
  const PROGRAMME_CFG: Record<string, { days: number; weeks: number }> = {
    "16_semaines": { days: 112, weeks: 16 },
    "6_mois":      { days: 183, weeks: 26 },
    "12_mois":     { days: 365, weeks: 52 },
  };
  const dureeKey =
    profile?.programme_type === "N2" && profile?.programme_duree
      ? profile.programme_duree
      : "16_semaines";
  const cfg = PROGRAMME_CFG[dureeKey] ?? PROGRAMME_CFG["16_semaines"];

  // Calcul semaine courante
  let semaineLabel = "";
  let semaineProgress = 0;
  if (profile?.date_demarrage) {
    const start = new Date(profile.date_demarrage);
    const now = new Date();
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
      <AppHeader />
      <PushSubscriber />

      <div className="mx-auto" style={{ maxWidth: 480 }}>

        {/* Message module verrouillé */}
        {locked === "1" && (
          <div style={{ margin: "12px 16px 0", backgroundColor: "#1a1a1a", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 10, padding: "12px 16px" }}>
            <p className="font-body" style={{ fontSize: "0.8rem", color: "#F87171", margin: 0 }}>
              🔒 Ce module n&apos;est pas encore disponible.
            </p>
          </div>
        )}

        {/* Greeting */}
        <div style={{ padding: "20px 16px 6px" }}>
          <p className="font-body text-sm" style={{ color: "#555" }}>
            Bonjour,{" "}
            <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{firstName}</span>
          </p>
        </div>

        {/* Barre de progression semaine */}
        {semaineLabel && (
          <div style={{ padding: "8px 16px 4px" }}>
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
                <div
                  style={{
                    height: "100%",
                    width: `${semaineProgress * 100}%`,
                    backgroundColor: "#B22222",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 16px" }}>
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
