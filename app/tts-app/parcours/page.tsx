import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOnboardingModules } from "@/lib/tts-client";

export const dynamic = "force-dynamic";

export default async function ParcoursPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const modules = await getOnboardingModules(user!.id);

  const totalVideos = modules.reduce((acc, m) => acc + m.videos.length, 0);
  const watchedVideos = modules.reduce((acc, m) => acc + m.videos.filter((v) => v.watched).length, 0);
  const completedModules = modules.filter((m) => m.completed).length;
  const progressPct = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;

  return (
    <div style={{ padding: "24px 20px 0" }}>
      <h1 className="font-body" style={{ color: "#F5F5F0", fontSize: 15, fontWeight: 700, margin: 0 }}>Mon Parcours</h1>
      <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: "4px 0 18px" }}>Module onboarding · À suivre dans l&apos;ordre</p>

      <div style={{ height: 6, background: "#2A2020", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#B22222,#E63946)" }} />
      </div>
      <div className="font-body" style={{ color: "#8A8078", fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <span>{completedModules} modules validés sur {modules.length}</span>
        <span>{progressPct}%</span>
      </div>

      {modules.map((m, mIdx) => (
        <div key={m.id} style={{ marginBottom: 18 }}>
          <p className="font-body" style={{ color: m.unlocked ? "#F5F5F0" : "#555", fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>
            {mIdx + 1}. {m.titre} {m.completed && "✅"}
          </p>
          {m.videos.map((v, vIdx) => {
            const locked = !m.unlocked;
            const content = (
              <div style={{
                display: "flex", alignItems: "center", gap: 14, backgroundColor: "#1A1414", border: "1px solid #2A2020",
                borderRadius: 16, padding: 14, marginBottom: 8, opacity: locked ? 0.5 : 1,
              }}>
                <div style={{ width: 54, height: 54, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: "linear-gradient(135deg,#1f2a3a,#101820)" }}>
                  {locked ? "🔒" : v.watched ? "✅" : "📖"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{vIdx + 1}. {v.titre}</p>
                  <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: 0 }}>{locked ? "Verrouillé" : v.watched ? "Terminé" : "À regarder"}</p>
                </div>
                {locked ? (
                  <span className="font-body" style={{ background: "#2A2020", color: "#8A8078", fontSize: 10, padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>Verrouillé</span>
                ) : (
                  <span style={{ color: "#8A8078", fontSize: 18 }}>›</span>
                )}
              </div>
            );
            return locked ? (
              <div key={v.id}>{content}</div>
            ) : (
              <Link key={v.id} href={`/tts-app/parcours/${v.id}`} style={{ textDecoration: "none" }}>{content}</Link>
            );
          })}
        </div>
      ))}

      {modules.length === 0 && (
        <p className="font-body" style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>Aucun module disponible pour l&apos;instant.</p>
      )}
    </div>
  );
}
