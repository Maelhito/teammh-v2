import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getOnboardingModules, getWatchedVideoIds, getSeancesProgress, getObjectif, getJoursEntrainement, getTtlSubscription } from "@/lib/ttl";
import { ttlObjectifLabel } from "@/lib/ttl-objectifs";
import { computeTtlBadges } from "@/lib/ttl-badges";
import { getStreak } from "@/lib/streak";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlSignOutButton from "./TtlSignOutButton";
import TtlManageSubscriptionButton from "./TtlManageSubscriptionButton";
import TtlStreakFlame from "@/components/TtlStreakFlame";
import TtlJoursEntrainement from "./TtlJoursEntrainement";
import { ttlColors } from "@/lib/ttl-theme";

export const dynamic = "force-dynamic";

export default async function TtlProfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, email, isPreview } = await getEffectiveUser(session);

  const offre = await requireTtlAccess(userId, isPreview);

  const [modules, watchedIds, seancesProgress, objectif, streakInfo, joursEntrainement, abonnement] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
    userId ? getSeancesProgress(userId) : Promise.resolve([]),
    userId ? getObjectif(userId) : Promise.resolve(null),
    userId ? getStreak(userId) : Promise.resolve({ streak_current: 0, streak_last_activity: null, streak_freezes: 0 }),
    userId ? getJoursEntrainement(userId) : Promise.resolve([]),
    userId ? getTtlSubscription(userId) : Promise.resolve(null),
  ]);

  const dateDebutLabel = offre?.date_debut
    ? new Date(offre.date_debut + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const totalModules = modules.length;
  const completedModules = modules.filter((m) => m.videos.length > 0 && m.videos.every((v) => watchedIds.has(v.id))).length;
  const seancesValidees = seancesProgress.length;
  const joursDepuisDebut = offre?.date_debut ? Math.floor((Date.now() - new Date(offre.date_debut).getTime()) / 86400000) : 0;

  const onboardingDone = totalModules > 0 && completedModules === totalModules;
  const badges = computeTtlBadges({
    hasWatchedAny: watchedIds.size > 0,
    onboardingDone,
    seancesValidees,
    streakCurrent: streakInfo.streak_current,
    joursDepuisDebut,
  });
  const badgeCategories = [...new Set(badges.map((b) => b.category))];
  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);
  const earnedByCategory = badgeCategories
    .map((category) => ({ category, items: earnedBadges.filter((b) => b.category === category) }))
    .filter((g) => g.items.length > 0);
  const lockedByCategory = badgeCategories
    .map((category) => ({ category, items: lockedBadges.filter((b) => b.category === category) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Profil" subtitle={email || undefined} />

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#1f2a3a,#101820)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 700 }}>
              {(firstName || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-body" style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 700 }}>{firstName || "Cliente"}</p>
              <span
                className="font-body"
                style={{ display: "inline-block", marginTop: 6, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(230,57,70,0.4)", color: ttlColors.redBright, fontSize: 10, letterSpacing: "1px", padding: "3px 9px", borderRadius: 20, fontWeight: 700 }}
              >
                TIME TO LAST
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
              <TtlStreakFlame days={streakInfo.streak_current} />
              <p className="font-body" style={{ margin: "4px 0 0", color: "#fff", fontSize: 18, fontWeight: 700 }}>{streakInfo.streak_current}</p>
              <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 11 }}>jour{streakInfo.streak_current > 1 ? "s" : ""} de suite</p>
              {!!streakInfo.streak_freezes && (
                <p className="font-body" style={{ margin: "4px 0 0", color: "#8EC9E8", fontSize: 11 }}>
                  ❄️ {streakInfo.streak_freezes} gel{streakInfo.streak_freezes > 1 ? "s" : ""} en réserve
                </p>
              )}
            </div>
            <div style={{ flex: 1, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 22 }}>🏋️</p>
              <p className="font-body" style={{ margin: "4px 0 0", color: "#fff", fontSize: 18, fontWeight: 700 }}>{seancesValidees}</p>
              <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 11 }}>séance{seancesValidees > 1 ? "s" : ""} validée{seancesValidees > 1 ? "s" : ""}</p>
            </div>
          </div>

          {objectif && (
            <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 18px", marginTop: 12 }}>
              <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 12 }}>Ton objectif</p>
              <p className="font-body" style={{ margin: "4px 0 0", color: "#fff", fontSize: 14, fontWeight: 600 }}>{ttlObjectifLabel(objectif) ?? objectif}</p>
            </div>
          )}

          <TtlJoursEntrainement initialJours={joursEntrainement} />

          {dateDebutLabel && (
            <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 18px", marginTop: 12 }}>
              <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 12 }}>Date de démarrage</p>
              <p className="font-body" style={{ margin: "4px 0 0", color: "#fff", fontSize: 14, fontWeight: 600 }}>{dateDebutLabel}</p>
            </div>
          )}

          <p className="font-body" style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", margin: "24px 0 10px" }}>MES BADGES</p>
          {earnedBadges.length > 0 ? (
            earnedByCategory.map(({ category, items }) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 8px" }}>
                  {category.toUpperCase()}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {items.map((b) => (
                    <div
                      key={b.label}
                      style={{
                        background: "rgba(230,57,70,0.1)",
                        border: `1px solid ${ttlColors.redBright}`,
                        borderRadius: 14,
                        padding: "14px 12px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 26 }}>{b.emoji}</p>
                      <p className="font-body" style={{ margin: "6px 0 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: "0 0 16px" }}>
              Pas encore de badge — continue pour en débloquer !
            </p>
          )}

          {lockedBadges.length > 0 && (
            <details style={{ marginTop: 4, marginBottom: 8 }}>
              <summary
                className="font-body"
                style={{ color: ttlColors.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 0" }}
              >
                {lockedBadges.length} badge{lockedBadges.length > 1 ? "s" : ""} à débloquer
              </summary>
              {lockedByCategory.map(({ category, items }) => (
                <div key={category} style={{ marginTop: 12 }}>
                  <p className="font-body" style={{ color: ttlColors.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 8px" }}>
                    {category.toUpperCase()}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {items.map((b) => (
                      <div
                        key={b.label}
                        style={{
                          background: ttlColors.card,
                          border: `1px solid ${ttlColors.cardBorder}`,
                          borderRadius: 14,
                          padding: "14px 12px",
                          textAlign: "center",
                          opacity: 0.45,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 26 }}>{b.emoji}</p>
                        <p className="font-body" style={{ margin: "6px 0 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>{b.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </details>
          )}

          {/* Ce qui compte, c'est qu'un abonnement existe — pas la façon dont
              l'offre a été attribuée. Une cliente que le coach a abonnée à la
              main dans Stripe doit pouvoir le résilier elle-même. */}
          {abonnement && <TtlManageSubscriptionButton />}
          <TtlSignOutButton />
        </div>
      </div>

      <TtlBottomNav />
    </div>
  );
}
