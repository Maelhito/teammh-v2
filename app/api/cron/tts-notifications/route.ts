import { NextRequest, NextResponse } from "next/server";
import { executerCronNotifications } from "@/lib/notifications/cron";
import { cronAutorise } from "@/lib/notifications/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ancienne adresse, conservée vivante.
 *
 * Elle ne fait plus de tri par région (le paramètre `?region=nc` est ignoré) :
 * le passage unique lit l'heure locale de chaque personne. On la garde parce
 * que des déclencheurs externes et le vercel.json pointent encore dessus —
 * la supprimer ferait taire des notifications sans que rien ne l'annonce.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorise(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resultat = await executerCronNotifications();
  return NextResponse.json({ ...resultat, note: "alias de /api/cron/notifications" });
}
