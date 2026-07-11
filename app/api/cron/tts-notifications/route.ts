import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INACTIVITY_DAYS = 2;

/** Heure locale d'un instant UTC dans un fuseau donné */
function localTime(utcNow: Date, timezone: string): { hour: number; minute: number; dateStr: string; dayOfWeek: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
      weekday: "short",
    });
    const parts = Object.fromEntries(fmt.formatToParts(utcNow).map((p) => [p.type, p.value]));
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      hour: parseInt(parts.hour === "24" ? "0" : (parts.hour ?? "0")),
      minute: parseInt(parts.minute ?? "0"),
      dateStr: `${parts.year}-${parts.month}-${parts.day}`,
      dayOfWeek: weekdayMap[parts.weekday ?? "Sun"] ?? 0,
    };
  } catch {
    return {
      hour: utcNow.getUTCHours(),
      minute: utcNow.getUTCMinutes(),
      dateStr: utcNow.toISOString().slice(0, 10),
      dayOfWeek: utcNow.getUTCDay(),
    };
  }
}

/** Tente d'insérer dans notif_log — retourne false si déjà envoyé aujourd'hui pour ce type */
async function tryMarkSent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  type: string,
  dateStr: string
): Promise<boolean> {
  const { error } = await admin
    .from("notif_log")
    .insert({ user_id: userId, type, sent_date: dateStr });
  return !error;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const utcNow = new Date();
  const admin = createSupabaseAdminClient();
  const logs: string[] = [];
  let sent = 0;

  const { data: offres } = await admin
    .from("offres_clientes")
    .select("user_id")
    .eq("offre", "TTS");
  const ttsUserIds = new Set((offres ?? []).map((o) => o.user_id));
  if (ttsUserIds.size === 0) {
    return NextResponse.json({ success: true, sent: 0, logs: ["Aucune cliente TTS"] });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, timezone")
    .in("user_id", [...ttsUserIds]);
  const users = [...new Map((subs ?? []).map((s) => [s.user_id, s.timezone ?? "Europe/Paris"])).entries()];

  for (const [userId, timezone] of users) {
    const { hour, dateStr, dayOfWeek } = localTime(utcNow, timezone);

    const [{ data: lastVideo }, { data: lastSeance }, { data: profile }, { data: prefs }] = await Promise.all([
      admin.from("tts_modules_progress").select("watched_at").eq("user_id", userId).order("watched_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("tts_seances_progress").select("validated_at").eq("user_id", userId).order("validated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("user_profiles").select("streak_current, streak_last_activity").eq("user_id", userId).maybeSingle(),
      admin.from("tts_objectifs").select("jours_entrainement").eq("user_id", userId).maybeSingle(),
    ]);

    const timestamps = [lastVideo?.watched_at, lastSeance?.validated_at].filter(Boolean) as string[];
    const lastActivity = timestamps.length ? new Date(Math.max(...timestamps.map((t) => new Date(t).getTime()))) : null;
    const diffDays = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / 86400000) : Infinity;

    // 1. Relance générale si inactivité >= 2 jours
    if (diffDays >= INACTIVITY_DAYS) {
      const canSend = await tryMarkSent(admin, userId, "tts_inactivite", dateStr);
      if (canSend) {
        await sendPushToUser(userId, {
          title: "🔥 On ne t'a pas vue !",
          body: "Ta séance et tes modules t'attendent sur Time To Start — reviens quand tu veux 💪",
          url: "/tts",
        });
        logs.push(`[tts-inactivite] notif envoyée → ${userId} (${diffDays === Infinity ? "jamais actif" : `${diffDays}j`})`);
        sent++;
      }
    }

    // 2. Alerte flamme en danger à 21h locale — a une flamme à perdre et rien fait aujourd'hui
    if (hour === 21) {
      const streakCurrent = profile?.streak_current ?? 0;
      const activeToday = (profile?.streak_last_activity ?? null) === dateStr;
      if (streakCurrent > 0 && !activeToday) {
        const canSend = await tryMarkSent(admin, userId, "tts_flamme_danger", dateStr);
        if (canSend) {
          await sendPushToUser(userId, {
            title: "🔥 Ta flamme s'éteint dans 3h !",
            body: `${streakCurrent} jour${streakCurrent > 1 ? "s" : ""} de suite — une capsule de 2 min suffit pour la garder`,
            url: "/tts",
          });
          logs.push(`[tts-flamme-danger] notif envoyée → ${userId} (streak ${streakCurrent})`);
          sent++;
        }
      }
    }

    // 3. Rappel du matin (7h locale) si aujourd'hui est un jour d'entraînement choisi
    if (hour === 7) {
      const joursChoisis = (prefs?.jours_entrainement ?? []).map(Number);
      if (joursChoisis.includes(dayOfWeek)) {
        const canSend = await tryMarkSent(admin, userId, "tts_jour_entrainement", dateStr);
        if (canSend) {
          await sendPushToUser(userId, {
            title: "💪 C'est ton jour de séance !",
            body: "Tu t'étais dit que tu t'entraînerais aujourd'hui — on y va ?",
            url: "/tts/bibliotheque?tab=seances",
          });
          logs.push(`[tts-jour-entrainement] notif envoyée → ${userId}`);
          sent++;
        }
      }
    }

    // 4. Récap dominical (dimanche 19h locale) — bilan de la semaine écoulée
    if (dayOfWeek === 0 && hour === 19) {
      const canSend = await tryMarkSent(admin, userId, "tts_recap_dominical", dateStr);
      if (canSend) {
        const weekAgo = new Date(utcNow.getTime() - 7 * 86400000).toISOString();
        const { count: seancesWeek } = await admin
          .from("tts_seances_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("validated_at", weekAgo);
        const streakCurrent = profile?.streak_current ?? 0;
        const n = seancesWeek ?? 0;
        await sendPushToUser(userId, {
          title: "📊 Ton récap de la semaine",
          body: n > 0
            ? `${n} séance${n > 1 ? "s" : ""} validée${n > 1 ? "s" : ""} cette semaine · flamme à ${streakCurrent}j. Bravo !`
            : `Pas de séance cette semaine — nouvelle semaine, nouvelle chance dès demain 💪`,
          url: "/tts/profil",
        });
        logs.push(`[tts-recap-dominical] notif envoyée → ${userId} (${n} séances, streak ${streakCurrent})`);
        sent++;
      }
    }
  }

  logs.push(`[tts-cron] terminé — ${sent} notif(s)`);
  console.log(logs.join("\n"));
  return NextResponse.json({ success: true, sent, logs });
}
