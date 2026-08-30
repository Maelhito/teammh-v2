import Link from "next/link";
import type { TtlModule } from "@/lib/ttl";
import { ttlColors } from "@/lib/ttl-theme";

interface Props {
  modules: TtlModule[];
  watchedIds: Set<string>;
  unlocks: boolean[];
}

/**
 * Le chemin des modules d'onboarding, en pastilles reliées.
 * Vit sur l'accueil (l'onglet « Mon Parcours » a disparu de la barre du bas) :
 * la cliente retrouve sa progression sans changer d'écran.
 */
export default function TtlParcoursTimeline({ modules, watchedIds, unlocks }: Props) {
  const total = modules.length;
  if (total === 0) return null;

  const completedModules = modules.filter((m) => m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id))).length;
  const progress = completedModules / total;

  return (
    <div>
      <style>{`
        @keyframes ttl-node-pulse {
          0% { box-shadow: 0 0 0 0 rgba(230,57,70,0.55); }
          70% { box-shadow: 0 0 0 10px rgba(230,57,70,0); }
          100% { box-shadow: 0 0 0 0 rgba(230,57,70,0); }
        }
      `}</style>

      <div style={{ height: 6, background: ttlColors.cardBorder, borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: `linear-gradient(90deg, ${ttlColors.red}, ${ttlColors.redBright})` }} />
      </div>
      <div className="font-body" style={{ color: ttlColors.muted, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <span>{completedModules} module{completedModules > 1 ? "s" : ""} validé{completedModules > 1 ? "s" : ""} sur {total}</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>

      {modules.map((m, i) => {
        const unlocked = unlocks[i];
        const completed = m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id));
        const inProgress = unlocked && !completed && m.videos.some((v) => watchedIds.has(v.id));
        const isLast = i === total - 1;

        const nodeBg = completed ? ttlColors.green : unlocked ? ttlColors.red : ttlColors.card;
        const nodeBorder = completed ? ttlColors.green : unlocked ? ttlColors.redBright : ttlColors.cardBorder;
        const prevCompleted = i > 0 && modules[i - 1].videos.length > 0 && modules[i - 1].videos.every((v) => watchedIds.has(v.id));
        const lineAboveColor = prevCompleted ? ttlColors.green : ttlColors.cardBorder;

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
    </div>
  );
}
