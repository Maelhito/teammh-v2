import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtsAccess } from "@/lib/tts-access";
import {
  getOnboardingModules,
  getWatchedVideoIds,
  getProgrammes,
  computeCurrentNumeroMois,
  computeCurrentSemaine,
  getRecettes,
  getCapsules,
  getObjectif,
  getSeancesProgress,
} from "@/lib/tts";
import { computeTtsModuleUnlock } from "@/lib/tts-unlock";
import { ttsObjectifLabel, ttsObjectifEmoji, ttsObjectifTagline } from "@/lib/tts-objectifs";
import { computeTtsBadges, isBilanUnlocked } from "@/lib/tts-badges";
import { getStreak } from "@/lib/streak";
import { ttsColors } from "@/lib/tts-theme";
import TtsHeader from "@/components/TtsHeader";
import TtsBottomNav from "@/components/TtsBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import { TtsProgressRing } from "@/components/TtsUI";
import TtsUpgradeTeaser from "@/components/TtsUpgradeTeaser";
import PushSubscriber from "@/components/PushSubscriber";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import TtsWelcomePopup from "@/components/TtsWelcomePopup";

export const dynamic = "force-dynamic";

const QUEST_STYLES: Record<string, { bg: string; emoji: string; label: string; href: string }> = {
  seance: { bg: "#3a1414", emoji: "🏋️", label: "Séance du mois", href: "/tts/bibliotheque?tab=seances" },
  recette: { bg: "#1f2a14", emoji: "🥗", label: "Recette du jour", href: "/tts/bibliotheque?tab=recettes" },
  capsule: { bg: "#241433", emoji: "💡", label: "Capsule motiv'", href: "/tts/bibliotheque?tab=capsules" },
};

export default async function TtsAccueilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  const offre = await requireTtsAccess(userId, isPreview);

  const [modules, watchedIds, programmes, recettes, capsules, streakInfo, objectif, seancesProgress] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
    getProgrammes(),
    getRecettes(),
    getCapsules(),
    userId ? getStreak(userId) : Promise.resolve({ streak_current: 0, streak_last_activity: null, streak_freezes: 0 }),
    userId ? getObjectif(userId) : Promise.resolve(null),
    userId ? getSeancesProgress(userId) : Promise.resolve([]),
  ]);

  const totalModules = modules.length;
  const completedModules = modules.filter((m) => m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id))).length;
  const currentModuleIndex = modules.findIndex((m) => !(m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id))));
  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : null;
  const onboardingDone = totalModules > 0 && completedModules === totalModules;
  const unlocks = computeTtsModuleUnlock(modules, watchedIds);

  const currentNumeroMois = offre?.date_debut ? computeCurrentNumeroMois(offre.date_debut) : 1;
  const currentSemaine = offre?.date_debut ? computeCurrentSemaine(offre.date_debut) : 1;
  const sortedProgrammes = [...programmes].sort((a, b) => a.numero_mois - b.numero_mois);
  const currentProgramme = sortedProgrammes.filter((p) => p.numero_mois <= currentNumeroMois).pop() ?? null;

  const recetteDuJour = recettes[0] ?? null;
  const capsuleDuJour = capsules[0] ?? null;
  const seancesValidees = seancesProgress.length;

  // Mission du jour : onboarding en priorité, sinon la séance de la semaine en cours
  let mission: { title: string; subtitle: string; progress: number; href: string } | null = null;
  if (totalModules > 0 && !onboardingDone && currentModule) {
    mission = {
      title: "Ta mission du jour",
      subtitle: currentModule.titre,
      progress: completedModules / totalModules,
      href: unlocks[currentModuleIndex] ? `/tts/modules/${currentModule.id}` : "/tts/parcours",
    };
  } else if (currentProgramme && currentProgramme.videos.length > 0) {
    const validatedThisWeek = currentProgramme.videos.filter((v) =>
      seancesProgress.some((p) => p.video_id === v.id && p.semaine === currentSemaine)
    ).length;
    mission = {
      title: "Ton programme du mois",
      subtitle: currentProgramme.titre || `Mois ${currentProgramme.numero_mois}`,
      progress: validatedThisWeek / currentProgramme.videos.length,
      href: "/tts/bibliotheque?tab=seances",
    };
  }

  const quests = [
    currentProgramme && currentProgramme.videos.length > 0 ? "seance" : null,
    recetteDuJour ? "recette" : null,
    capsuleDuJour ? "capsule" : null,
  ].filter(Boolean) as (keyof typeof QUEST_STYLES)[];

  const joursDepuisDebut = offre?.date_debut ? Math.floor((Date.now() - new Date(offre.date_debut).getTime()) / 86400000) : 0;

  const badges = computeTtsBadges({
    hasWatchedAny: watchedIds.size > 0,
    onboardingDone,
    seancesValidees,
    streakCurrent: streakInfo.streak_current,
    joursDepuisDebut,
  });
  const badgesEarned = badges.filter((b) => b.earned).length;
  const bilanUnlocked = isBilanUnlocked({ onboardingDone, seancesValidees, streakCurrent: streakInfo.streak_current });

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}
      {!isPreview && <PushSubscriber />}
      {!isPreview && <TtsWelcomePopup firstName={firstName || "toi"} objectifLabel={ttsObjectifLabel(objectif)} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtsHeader
          variant="home"
          firstName={firstName || "toi"}
          offerLabel="TIME TO START"
          streak={streakInfo.streak_current}
          freezes={streakInfo.streak_freezes}
          objectifLabel={ttsObjectifLabel(objectif)}
          objectifEmoji={ttsObjectifEmoji(objectif)}
        />

        {!isPreview && <InstallAppPrompt app="tts" />}

        <div style={{ padding: "20px 20px 100px" }}>

          {ttsObjectifTagline(objectif) && (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.4 }}>
              {ttsObjectifTagline(objectif)}
            </p>
          )}

          {mission ? (
            <Link href={mission.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{ background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 20, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
                <TtsProgressRing progress={mission.progress}>
                  <span className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{Math.round(mission.progress * 100)}%</span>
                </TtsProgressRing>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-body" style={{ color: ttsColors.redBright, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 4px" }}>{mission.title.toUpperCase()}</p>
                  <p className="font-body" style={{ color: "#fff", fontSize: 14.5, fontWeight: 600, margin: "0 0 10px", lineHeight: 1.3 }}>{mission.subtitle}</p>
                  <div style={{ background: ttsColors.red, borderRadius: 10, padding: "8px 0", textAlign: "center" }}>
                    <span className="font-body" style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Continuer →</span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>
              Aucun contenu pour l&apos;instant — reviens bientôt.
            </p>
          )}

          <TtsUpgradeTeaser
            unlocked={bilanUnlocked}
            title={bilanUnlocked ? "Prête pour la suite ?" : "Ton bilan gratuit avec un coach"}
            subtitle="Avec un coach, ce parcours devient un vrai programme sur mesure, suivi chaque semaine."
            lockedHint="Termine ton onboarding, valide 5 séances ou tiens 7 jours de suite pour le débloquer."
          />

          {quests.length > 0 && (
            <>
              <p className="font-body" style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", margin: "22px 0 10px" }}>
                À explorer aujourd&apos;hui
              </p>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {quests.map((key) => {
                  const q = QUEST_STYLES[key];
                  return (
                    <Link key={key} href={q.href} style={{ textDecoration: "none", flexShrink: 0 }}>
                      <div style={{ width: 112, background: q.bg, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                        <p style={{ fontSize: 26, margin: "0 0 8px" }}>{q.emoji}</p>
                        <p className="font-body" style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.3 }}>{q.label}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          <Link href="/tts/profil" style={{ textDecoration: "none" }}>
            <div style={{ marginTop: 20, background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🏅</span>
                <p className="font-body" style={{ fontSize: 12.5, color: "#fff", margin: 0 }}>
                  {badgesEarned} badge{badgesEarned > 1 ? "s" : ""} débloqué{badgesEarned > 1 ? "s" : ""} sur {badges.length}
                </p>
              </div>
              <span style={{ fontSize: 14, color: ttsColors.muted }}>›</span>
            </div>
          </Link>

        </div>
      </div>

      <TtsBottomNav />
    </div>
  );
}
