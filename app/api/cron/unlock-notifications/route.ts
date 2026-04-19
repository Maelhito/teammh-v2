import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser, sendPushToAll } from "@/lib/push";
import { getModules } from "@/lib/modules";

/**
 * Cron toutes les 30 minutes (vercel.json : "* /30 * * * *")
 *
 * À chaque run :
 *   - runCalendarRappelMinutes() → rappels 30 min / 1h avant un événement
 *
 * Uniquement à minuit UTC (hourUTC === 0) :
 *   - runModuleUnlockNotifications() → notifie le déblocage module 4 (2h après module 3)
 *   - runCalendarVeilleReminders()   → rappels "demain" pour les événements rappel=true
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
    console.log("[cron] Unauthorized — header reçu:", authHeader?.slice(0, 30) ?? "aucun");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const hourUTC = now.getUTCHours();
  const logs: string[] = [`[cron] démarrage ${now.toISOString()} (UTC h=${hourUTC})`];

  const results = {
    moduleUnlockSent: 0,
    calendarVeilleSent: 0,
    calendarRappelSent: 0,
  };

  // ── 21h UTC = 8h NC (Pacific/Noumea UTC+11) ───────────────────────────────
  if (hourUTC === 21) {
    results.moduleUnlockSent = await runModuleUnlockNotifications(logs);
    results.calendarVeilleSent = await runCalendarVeilleReminders(logs);
  } else {
    logs.push("[cron] heure ≠ 21 — skip module unlock + veille reminders");
  }

  // ── Every 30 min ───────────────────────────────────────────────────────────
  results.calendarRappelSent = await runCalendarRappelMinutes(now, logs);

  logs.push(`[cron] résultats : ${JSON.stringify(results)}`);
  console.log(logs.join("\n"));

  return NextResponse.json({ success: true, ...results, logs });
}

// ─── 1. Notification déblocage module 4 (2h après module 3) ──────────────────

async function runModuleUnlockNotifications(logs: string[]): Promise<number> {
  const modules = getModules();
  logs.push(`[modules] ${modules.length} modules chargés`);

  // Seul le passage module-3 → module suivant (index 2→3) a un délai de 2h
  const module3 = modules[2];
  const module4 = modules[3];
  if (!module3 || !module4) {
    logs.push("[modules] module 3 ou 4 introuvable — skip");
    return 0;
  }

  const admin = createSupabaseAdminClient();

  // Fenêtre : complétés entre 1h45 et 2h15 (±15 min autour des 2h)
  const minMs = 2 * 3600 * 1000 - 15 * 60 * 1000; // 1h45
  const maxMs = 2 * 3600 * 1000 + 15 * 60 * 1000; // 2h15
  const minDate = new Date(Date.now() - maxMs).toISOString();
  const maxDate = new Date(Date.now() - minMs).toISOString();

  logs.push(`[modules] fenêtre : ${minDate} → ${maxDate}`);

  const { data: completions, error } = await admin
    .from("module_completions")
    .select("user_id, completed_at")
    .eq("module_slug", module3.slug)
    .gte("completed_at", minDate)
    .lte("completed_at", maxDate);

  if (error) { logs.push(`[modules] erreur DB : ${error.message}`); return 0; }
  logs.push(`[modules] ${completions?.length ?? 0} completion(s) dans la fenêtre`);

  let sent = 0;
  for (const c of completions ?? []) {
    await sendPushToUser(c.user_id, {
      title: "🔓 Module disponible !",
      body: `"${module4.title}" est maintenant accessible.`,
      url: `/modules/${module4.slug}`,
    });
    logs.push(`[modules] notif envoyée → user ${c.user_id}`);
    sent++;
  }
  return sent;
}

// ─── 2. Rappels "la veille" (rappel = true, tourne à minuit) ─────────────────

async function runCalendarVeilleReminders(logs: string[]): Promise<number> {
  const admin = createSupabaseAdminClient();

  // Calcul en heure NC (UTC+11) pour que "demain" soit correct côté clientes
  const NC_OFFSET_MS = 11 * 60 * 60 * 1000;
  const nowNC = new Date(Date.now() + NC_OFFSET_MS);
  const tomorrow = new Date(nowNC);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const tomorrowDay = tomorrow.getUTCDay();
  const tomorrowDayOfMonth = tomorrow.getUTCDate();

  logs.push(`[veille] date demain : ${tomorrowStr}`);

  const { data: events, error } = await admin
    .from("calendar_events")
    .select("id, titre, date, heure, recurrence, target_user_id, user_id")
    .eq("rappel", true);

  if (error) { logs.push(`[veille] erreur DB : ${error.message}`); return 0; }
  logs.push(`[veille] ${events?.length ?? 0} événement(s) avec rappel=true`);

  let sent = 0;
  for (const evt of events ?? []) {
    const evtDate = evt.date as string;
    const evtDay = new Date(evtDate + "T00:00:00Z").getUTCDay();
    const evtDayOfMonth = new Date(evtDate + "T00:00:00Z").getUTCDate();

    const appliesTomorrow = (() => {
      if (evtDate > tomorrowStr) return false;
      switch (evt.recurrence) {
        case "none":    return evtDate === tomorrowStr;
        case "daily":   return evtDate <= tomorrowStr;
        case "weekly":  return evtDay === tomorrowDay && evtDate <= tomorrowStr;
        case "monthly": return evtDayOfMonth === tomorrowDayOfMonth && evtDate <= tomorrowStr;
        default:        return false;
      }
    })();

    if (!appliesTomorrow) continue;

    const heureStr = evt.heure ? ` à ${String(evt.heure).slice(0, 5)}` : "";
    const payload = {
      title: "🔔 Rappel — demain",
      body: `${evt.titre}${heureStr}`,
      url: "/calendrier",
    };

    if (evt.target_user_id === null) {
      await sendPushToAll(payload);
      logs.push(`[veille] broadcast → "${evt.titre}"`);
    } else {
      await sendPushToUser(evt.target_user_id as string, payload);
      logs.push(`[veille] user ${evt.target_user_id} → "${evt.titre}"`);
    }
    sent++;
  }
  return sent;
}

// ─── 3. Rappels X minutes avant (tourne toutes les 30 min) ───────────────────

async function runCalendarRappelMinutes(now: Date, logs: string[]): Promise<number> {
  const admin = createSupabaseAdminClient();

  // Conversion en heure NC (UTC+11) — les événements sont saisis en heure locale NC
  const NC_OFFSET_MS = 11 * 60 * 60 * 1000;
  const nowNC = new Date(now.getTime() + NC_OFFSET_MS);
  const todayStr = nowNC.toISOString().slice(0, 10);
  const todayDay = nowNC.getUTCDay();
  const todayDayOfMonth = nowNC.getUTCDate();
  const nowMinutes = nowNC.getUTCHours() * 60 + nowNC.getUTCMinutes(); // minutes depuis minuit NC

  logs.push(`[rappel] nowNC=${todayStr} ${nowNC.toISOString().slice(11, 16)} NC (min depuis minuit NC=${nowMinutes})`);

  // Récupère tous les événements ayant un rappel_minutes > 0 et une heure définie
  const { data: events, error } = await admin
    .from("calendar_events")
    .select("id, titre, date, heure, recurrence, rappel_minutes, target_user_id, user_id")
    .gt("rappel_minutes", 0)
    .not("heure", "is", null);

  if (error) { logs.push(`[rappel] erreur DB : ${error.message}`); return 0; }
  logs.push(`[rappel] ${events?.length ?? 0} événement(s) avec rappel_minutes > 0`);

  let sent = 0;
  for (const evt of events ?? []) {
    const evtDate = evt.date as string;
    const rappelMinutes = (evt.rappel_minutes as number) ?? 0;

    // Vérifie si l'événement se produit aujourd'hui (selon sa récurrence)
    const evtDay = new Date(evtDate + "T00:00:00Z").getUTCDay();
    const evtDayOfMonth = new Date(evtDate + "T00:00:00Z").getUTCDate();

    const appliesToday = (() => {
      if (evtDate > todayStr) return false;
      switch (evt.recurrence) {
        case "none":    return evtDate === todayStr;
        case "daily":   return evtDate <= todayStr;
        case "weekly":  return evtDay === todayDay && evtDate <= todayStr;
        case "monthly": return evtDayOfMonth === todayDayOfMonth && evtDate <= todayStr;
        default:        return false;
      }
    })();

    if (!appliesToday) continue;

    // Convertit l'heure de l'événement en minutes depuis minuit UTC
    const heureRaw = String(evt.heure).slice(0, 5); // "HH:MM"
    const [hh, mm] = heureRaw.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) continue;
    const evtMinutes = hh * 60 + mm;

    // Fenêtre : maintenant + rappel_minutes ± 15 min
    const targetMinutes = evtMinutes - rappelMinutes;
    const windowMin = targetMinutes - 15;
    const windowMax = targetMinutes + 15;

    logs.push(`[rappel] "${evt.titre}" evtMin=${evtMinutes} rappel=${rappelMinutes} → cible=${targetMinutes} fenêtre=[${windowMin},${windowMax}] now=${nowMinutes}`);

    if (nowMinutes < windowMin || nowMinutes > windowMax) continue;

    const payload = {
      title: `⏰ Dans ${rappelMinutes} min`,
      body: evt.titre as string,
      url: "/calendrier",
    };

    if (evt.target_user_id === null) {
      await sendPushToAll(payload);
      logs.push(`[rappel] broadcast → "${evt.titre}" (${rappelMinutes} min avant)`);
    } else {
      await sendPushToUser(evt.target_user_id as string, payload);
      logs.push(`[rappel] user ${evt.target_user_id} → "${evt.titre}" (${rappelMinutes} min avant)`);
    }
    sent++;
  }
  return sent;
}
