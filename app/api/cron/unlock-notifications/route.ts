import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser, sendPushToAll } from "@/lib/push";
import { getModules } from "@/lib/modules";

// Ce cron tourne à minuit chaque jour (vercel.json).
// Il fait deux choses :
//   1. Notifie les modules 4–7 qui viennent de se débloquer (48h après validation du précédent)
//   2. Envoie des rappels push pour les événements calendrier du lendemain avec rappel = true

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [moduleResult, calendarResult] = await Promise.all([
    runModuleNotifications(),
    runCalendarReminders(),
  ]);

  return NextResponse.json({
    success: true,
    moduleNotifSent: moduleResult,
    calendarRemindersSent: calendarResult,
  });
}

// ─── Module unlock notifications ─────────────────────────────────────────────

async function runModuleNotifications(): Promise<number> {
  const modules = getModules();
  const timeGatedPairs = [
    { prevSlug: modules[2].slug, nextSlug: modules[3].slug, nextTitle: modules[3].title },
    { prevSlug: modules[3].slug, nextSlug: modules[4].slug, nextTitle: modules[4].title },
    { prevSlug: modules[4].slug, nextSlug: modules[5].slug, nextTitle: modules[5].title },
    { prevSlug: modules[5].slug, nextSlug: modules[6].slug, nextTitle: modules[6].title },
  ];

  const admin = createSupabaseAdminClient();
  let notifSent = 0;

  for (const pair of timeGatedPairs) {
    const { data: completions } = await admin
      .from("module_completions")
      .select("user_id, completed_at")
      .eq("module_slug", pair.prevSlug)
      .gte("completed_at", new Date(Date.now() - 49 * 3600 * 1000).toISOString())
      .lte("completed_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString());

    if (!completions?.length) continue;

    for (const completion of completions) {
      await sendPushToUser(completion.user_id, {
        title: "🔓 Module disponible !",
        body: `Ton module "${pair.nextTitle}" est maintenant accessible.`,
        url: `/modules/${pair.nextSlug}`,
      });
      notifSent++;
    }
  }

  return notifSent;
}

// ─── Calendar reminders ───────────────────────────────────────────────────────

async function runCalendarReminders(): Promise<number> {
  const admin = createSupabaseAdminClient();

  // Calcule la date de demain en UTC (YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const tomorrowDay = tomorrow.getUTCDay(); // 0=Sun … 6=Sat
  const tomorrowDayOfMonth = tomorrow.getUTCDate();

  // Récupère tous les événements avec rappel actif
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, date, heure, recurrence, target_user_id, user_id")
    .eq("rappel", true);

  if (!events?.length) return 0;

  let sent = 0;

  for (const evt of events) {
    const evtDate = evt.date as string; // YYYY-MM-DD
    const evtDay = new Date(evtDate + "T00:00:00Z").getUTCDay();
    const evtDayOfMonth = new Date(evtDate + "T00:00:00Z").getUTCDate();

    // Vérifie si cet événement se produit demain selon sa récurrence
    const appliesTomorrow = (() => {
      if (evtDate > tomorrowStr) return false; // événement futur non encore atteint
      switch (evt.recurrence) {
        case "none":
          return evtDate === tomorrowStr;
        case "daily":
          return evtDate <= tomorrowStr;
        case "weekly":
          return evtDay === tomorrowDay && evtDate <= tomorrowStr;
        case "monthly":
          return evtDayOfMonth === tomorrowDayOfMonth && evtDate <= tomorrowStr;
        default:
          return false;
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
      // Événement broadcast → toutes les clientes
      await sendPushToAll(payload);
    } else {
      await sendPushToUser(evt.target_user_id as string, payload);
    }
    sent++;
  }

  return sent;
}
