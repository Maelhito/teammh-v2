import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { getFuseaux } from "@/lib/temps-serveur";

export const dynamic = "force-dynamic";

/**
 * Le fuseau de la cliente et celui du coach, côte à côte.
 *
 * Sert au formulaire de rendez-vous : c'est ce qui permet d'annoncer
 * « 9:00 chez toi → 10:00 pour elle » au moment de la saisie, avant que
 * l'erreur ne soit enregistrée.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clientId } = await params;
  if (!(await coachPeutVoirCliente(user, clientId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const fuseaux = await getFuseaux([user.id, clientId]);
  return NextResponse.json({
    coach: fuseaux.get(user.id),
    cliente: fuseaux.get(clientId),
  });
}
