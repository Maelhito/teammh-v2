import { NextRequest, NextResponse } from "next/server";
import { executerCronNotifications } from "@/lib/notifications/cron";
import { cronAutorise } from "@/lib/notifications/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * LE point d'entrée des notifications. À déclencher au moins toutes les heures
 * (idéalement tous les quarts d'heure, pour que le rappel « 1h avant un
 * rendez-vous » tombe juste).
 *
 * Sans danger à relancer : `notif_log` empêche tout doublon.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorise(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // `?simuler=1` (avec `&at=<ISO>` pour se placer à un autre instant) montre ce
  // qui partirait, sans rien envoyer. Utile pour vérifier qu'une cliente reçoit
  // bien sa notification à 7h CHEZ ELLE, sans attendre 7h.
  const simuler = request.nextUrl.searchParams.get("simuler") === "1";
  const at = request.nextUrl.searchParams.get("at");
  const instant = at ? new Date(at) : undefined;
  if (at && Number.isNaN(instant!.getTime())) {
    return NextResponse.json({ error: "Paramètre `at` invalide (format ISO attendu)" }, { status: 400 });
  }

  const resultat = await executerCronNotifications({ simuler, instant });
  return NextResponse.json(resultat);
}
