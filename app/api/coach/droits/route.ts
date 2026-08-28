import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess, isCoachOnly } from "@/lib/check-coach-access";

/**
 * Ce que la personne connectée a le droit de faire dans le portail coach.
 *
 * Les pages du portail sont des composants client : elles ne peuvent pas lire
 * la session côté serveur pour décider quels boutons afficher. Cette route est
 * leur unique source — et elle applique exactement la même règle que les routes
 * d'écriture, pour qu'un bouton visible corresponde toujours à une action
 * acceptée (et inversement).
 */
export async function GET(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  // En développement, checkCoachAccess renvoie toujours un admin : impossible
  // de voir l'écran tel qu'un coach le voit. `?dev_role=coach` simule ce cas.
  const simuleCoach =
    process.env.NODE_ENV === "development" && req.nextUrl.searchParams.get("dev_role") === "coach";

  return NextResponse.json({
    peutModifierBibliotheque: !simuleCoach && !isCoachOnly(user),
  });
}
