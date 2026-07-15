import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface StreakInfo {
  streak_current: number;
  streak_last_activity: string | null;
  streak_freezes?: number;
}

export async function getStreak(userId: string): Promise<StreakInfo> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("streak_current, streak_last_activity, streak_freezes")
    .eq("user_id", userId)
    .single();
  return {
    streak_current: data?.streak_current ?? 0,
    streak_last_activity: data?.streak_last_activity ?? null,
    streak_freezes: data?.streak_freezes ?? 0,
  };
}

export async function updateStreak(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("streak_current, streak_last_activity")
    .eq("user_id", userId)
    .single();

  const last = profile?.streak_last_activity ?? null;
  const current = profile?.streak_current ?? 0;

  if (last === today) return current;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak = last === yesterdayStr ? current + 1 : 1;

  await admin
    .from("user_profiles")
    .upsert(
      { user_id: userId, streak_current: newStreak, streak_last_activity: today },
      { onConflict: "user_id" }
    );

  return newStreak;
}
