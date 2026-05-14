import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { getModules } from "@/lib/modules";

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

// ─── Notification déblocage module 4 (2h après module 3) ─────────────────────

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

