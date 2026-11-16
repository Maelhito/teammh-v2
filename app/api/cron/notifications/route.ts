import { NextRequest, NextResponse } from "next/server";
import { executerCronNotifications } from "@/lib/notifications/cron";
import { cronAutorise } from "@/lib/notifications/auth";

export const dynamic = "force-dynamic";
// Marge large : le passage balaie toutes les personnes une par une, et un
// passage coupé en route laisserait les dernières sans notification.
export const maxDuration = 120;

/**
 * LE point d'entrée des notifications, déclenché par Vercel tous les quarts
 * d'heure (vercel.json, offre Pro).
 *
 * Le quart d'heure n'est pas un confort : le rappel « 1h avant un rendez-vous »
 * cherche les RDV entre 50 et 70 min, et le rappel de tâche ceux entre −15 et
 * +5 min. Avec un passage par heure, un RDV ou une tâche à 10h30 ne recevait
 * jamais son rappel. Les notifications du matin (7h) et du soir (19h) se
 * déclenchent, elles, sur l'heure locale de chaque personne.
 *
 * Avant le 16 nov. 2026, Vercel ne passait qu'une fois par jour (20h UTC, soit
 * 7h à Nouméa) : le reste reposait sur un déclencheur externe toutes les heures.
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
