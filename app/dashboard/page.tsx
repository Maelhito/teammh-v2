import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getModules } from "@/lib/modules";
import { getUserProfile, getModuleCompletions } from "@/lib/user-profile";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const userId = session?.user.id ?? "";
  const firstName = session?.user.user_metadata?.prenom
    ?? session?.user.email?.split("@")[0]
    ?? "";

  const modules = getModules();

  const [profile, completedSlugs] = await Promise.all([
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getModuleCompletions(userId) : Promise.resolve([]),
  ]);

  const completedSet = new Set(completedSlugs);
  const completedCount = completedSlugs.length;

  // Calcul semaine courante
  let semaineLabel = "";
  let semaineProgress = 0;
  if (profile?.date_demarrage) {
    const start = new Date(profile.date_demarrage);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const semaine = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 16);
    semaineLabel = `Semaine ${semaine} / 16`;
    semaineProgress = semaine / 16;
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader />

      <div className="mx-auto" style={{ maxWidth: 480 }}>

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

        {/* Module cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
          {modules.map((module, i) => {
            const done = completedSet.has(module.slug);
            return (
              <Link key={module.slug} href={`/modules/${module.slug}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    backgroundColor: "#111111",
                    borderRadius: 12,
                    border: done ? "1px solid rgba(74,222,128,0.2)" : "1px solid #1a1a1a",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span className="font-title" style={{ fontSize: "1.1rem", color: done ? "#4ADE80" : "#B22222", flexShrink: 0, lineHeight: 1 }}>
                      {done ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: done ? "rgba(245,245,240,0.6)" : "#F5F5F0", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {module.title}
                      </p>
                      <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", marginTop: 2 }}>
                        {module.category}{module.duration ? ` · ${module.duration}` : ""}
                      </p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={done ? "rgba(74,222,128,0.4)" : "#B22222"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
