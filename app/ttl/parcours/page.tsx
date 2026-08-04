import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getOnboardingModules, getWatchedVideoIds } from "@/lib/ttl";
import { computeTtlModuleUnlock } from "@/lib/ttl-unlock";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import Link from "next/link";
import { TtlSectionTitle } from "@/components/TtlUI";
import { ttlColors } from "@/lib/ttl-theme";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ locked?: string }>;
}

export default async function TtlParcoursPage({ searchParams }: PageProps) {
  const { locked } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtlAccess(userId, isPreview);

  const [modules, watchedIds] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
  ]);
  const unlocks = computeTtlModuleUnlock(modules, watchedIds);

  const totalModules = modules.length;
  const completedModules = modules.filter((m) => m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id))).length;
  const progress = totalModules ? completedModules / totalModules : 0;

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Mon Parcours" subtitle="Module onboarding · Démarrer" />

        <div style={{ padding: "20px 20px 100px" }}>

          {locked === "1" && (
            <div className="font-body" style={{ marginBottom: 16, backgroundColor: ttlColors.card, border: "1px solid rgba(230,57,70,0.35)", borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ fontSize: "0.8rem", color: ttlColors.redBright, margin: 0 }}>
                Ce module n&apos;est pas encore disponible.
              </p>
            </div>
          )}

          {totalModules > 0 && (
            <>
              <div style={{ height: 6, background: ttlColors.cardBorder, borderRadius: 6, overflow: "hidden", marginTop: 4, marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: `linear-gradient(90deg, ${ttlColors.red}, ${ttlColors.redBright})` }} />
              </div>
              <div className="font-body" style={{ color: ttlColors.muted, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                <span>{completedModules} module{completedModules > 1 ? "s" : ""} validé{completedModules > 1 ? "s" : ""} sur {totalModules}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </>
          )}

          {totalModules > 0 && (
            <style>{`
              @keyframes ttl-node-pulse {
                0% { box-shadow: 0 0 0 0 rgba(230,57,70,0.55); }
                70% { box-shadow: 0 0 0 10px rgba(230,57,70,0); }
                100% { box-shadow: 0 0 0 0 rgba(230,57,70,0); }
              }
            `}</style>
          )}

          {modules.map((m, i) => {
            const unlocked = unlocks[i];
            const completed = m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id));
            const inProgress = unlocked && !completed && m.videos.some((v) => watchedIds.has(v.id));
            const isLast = i === modules.length - 1;

            const nodeBg = completed ? ttlColors.green : unlocked ? ttlColors.red : ttlColors.card;
            const nodeBorder = completed ? ttlColors.green : unlocked ? ttlColors.redBright : ttlColors.cardBorder;
            const lineAboveColor = i > 0 && (modules[i - 1].videos.length > 0 && modules[i - 1].videos.every((v) => watchedIds.has(v.id))) ? ttlColors.green : ttlColors.cardBorder;

            const subtitle = !unlocked
              ? "Complète le module précédent"
              : completed
              ? `Terminé · ${m.videos.length} vidéo${m.videos.length > 1 ? "s" : ""}`
              : `${m.videos.filter((v) => watchedIds.has(v.id)).length}/${m.videos.length} vidéo${m.videos.length > 1 ? "s" : ""} · ${inProgress ? "En cours" : "À commencer"}`;

            const card = (
              <div
                style={{
                  flex: 1,
                  background: ttlColors.card,
                  border: `1px solid ${unlocked ? (completed ? "rgba(74,222,128,0.35)" : "rgba(230,57,70,0.35)") : ttlColors.cardBorder}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <p className="font-body" style={{ margin: "0 0 3px", color: "#fff", fontSize: "14.5px", fontWeight: 600 }}>{m.titre}</p>
                <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 12 }}>{subtitle}</p>
              </div>
            );

            return (
              <div key={m.id} style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  {i > 0 && <div style={{ width: 3, flex: "0 0 10px", background: lineAboveColor }} />}
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: nodeBg, border: `2px solid ${nodeBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: completed || unlocked ? "#fff" : ttlColors.muted,
                      animation: unlocked && !completed ? "ttl-node-pulse 2s infinite" : undefined,
                    }}
                  >
                    {completed ? "✓" : unlocked ? i + 1 : "🔒"}
                  </div>
                  {!isLast && <div style={{ width: 3, flex: 1, minHeight: 24, background: completed ? ttlColors.green : ttlColors.cardBorder }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 14 }}>
                  {unlocked ? (
                    <Link href={`/ttl/modules/${m.id}`} style={{ textDecoration: "none", display: "block" }}>{card}</Link>
                  ) : card}
                </div>
              </div>
            );
          })}
          {totalModules === 0 && (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Aucun module pour l&apos;instant.</p>
          )}

          {totalModules > 0 && (
            <>
              <TtlSectionTitle>Astuce</TtlSectionTitle>
              <div style={{ background: "rgba(178,34,34,0.08)", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 16, padding: 14 }}>
                <p className="font-body" style={{ color: "#cbb", fontSize: 12, margin: 0 }}>
                  Chaque module se débloque automatiquement une fois le précédent terminé.
                </p>
              </div>
            </>
          )}

        </div>
      </div>

      <TtlBottomNav />
    </div>
  );
}
