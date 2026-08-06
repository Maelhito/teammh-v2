import { NextRequest, NextResponse } from "next/server";

/**
 * Cron à 21h UTC = 8h NC (Pacific/Noumea UTC+11)
 * Notifie le déblocage module 4 (2h après la complétion du module 3)
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

  let moduleUnlockSent = 0;

  // ── 21h UTC = 8h NC (Pacific/Noumea UTC+11) ───────────────────────────────
  if (hourUTC === 21) {
    moduleUnlockSent = await runModuleUnlockNotifications(logs);
  } else {
    logs.push("[cron] heure ≠ 21 — skip module unlock");
  }

  logs.push(`[cron] résultats : moduleUnlockSent=${moduleUnlockSent}`);
  console.log(logs.join("\n"));

  return NextResponse.json({ success: true, moduleUnlockSent, logs });
}

// ─── Notification déblocage module (désactivé) ───────────────────────────────
// Tous les modules sont désormais accessibles librement (plus de délai/verrou),
// donc il n'y a plus de déblocage différé à notifier.

async function runModuleUnlockNotifications(logs: string[]): Promise<number> {
  logs.push("[modules] verrouillage désactivé — plus de notification de déblocage");
  return 0;
}

