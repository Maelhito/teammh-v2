import { NextRequest, NextResponse } from "next/server";
import { executerCronNotifications } from "@/lib/notifications/cron";
import { cronAutorise } from "@/lib/notifications/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ancienne adresse du déblocage différé des modules — fonctionnalité retirée
 * depuis (tous les modules sont accessibles librement), si bien que ce cron
 * répondait 200 sans rien faire.
 *
 * Or c'est LUI que le planificateur externe appelle avec succès, pendant que
 * le vrai cron de notifications échoue. Plutôt que de laisser un passage vert
 * qui rassure sans rien envoyer, il exécute désormais le même travail que les
 * autres. À repointer vers /api/cron/notifications quand ce sera fait.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorise(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resultat = await executerCronNotifications();
  return NextResponse.json({ ...resultat, note: "alias de /api/cron/notifications" });
}
