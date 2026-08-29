import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { aujourdhuiDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

const MAX_FREEZES = 2;
const FREEZE_EVERY_N_SEANCES = 3;

/**
 * Comme updateStreak (lib/streak.ts) mais consomme un gel au lieu de
 * réinitialiser la série si la cliente a raté un jour et qu'elle a un
 * gel disponible. Ne touche jamais lib/streak.ts (utilisé par TTM).
 */
export async function updateTtlStreak(userId: string): Promise<{ streak: number; freezeUsed: boolean }> {
  const admin = createSupabaseAdminClient();
  // Le jour compte dans le fuseau DE LA CLIENTE : sinon une séance validée le
  // matin (encore la veille pour un serveur en UTC) pouvait consommer un gel
  // ou casser la série au lieu de l'allonger.
  const fuseau = await getFuseau(userId);
  const today = aujourdhuiDans(fuseau);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("streak_current, streak_last_activity, streak_freezes")
    .eq("user_id", userId)
    .single();

  const last = profile?.streak_last_activity ?? null;
  const current = profile?.streak_current ?? 0;
  const freezes = profile?.streak_freezes ?? 0;

  if (last === today) return { streak: current, freezeUsed: false };

  const yesterdayStr = aujourdhuiDans(fuseau, new Date(Date.now() - 86400000));

  let newStreak: number;
  let newFreezes = freezes;
  let freezeUsed = false;

  if (last === yesterdayStr) {
    newStreak = current + 1;
  } else if (last && freezes > 0) {
    newStreak = current + 1;
    newFreezes = freezes - 1;
    freezeUsed = true;
  } else {
    newStreak = 1;
  }

  await admin
    .from("user_profiles")
    .upsert(
      { user_id: userId, streak_current: newStreak, streak_last_activity: today, streak_freezes: newFreezes },
      { onConflict: "user_id" }
    );

  return { streak: newStreak, freezeUsed };
}

/** Accorde un gel tous les N séances validées cumulées, plafonné. */
export async function grantStreakFreezeIfEligible(userId: string, totalSeancesValidees: number): Promise<void> {
  if (totalSeancesValidees === 0 || totalSeancesValidees % FREEZE_EVERY_N_SEANCES !== 0) return;

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("streak_freezes")
    .eq("user_id", userId)
    .single();

  const current = profile?.streak_freezes ?? 0;
  if (current >= MAX_FREEZES) return;

  await admin.from("user_profiles").update({ streak_freezes: current + 1 }).eq("user_id", userId);
}
