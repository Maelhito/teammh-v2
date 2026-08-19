import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Identité d'UNE cliente, pour l'en-tête de sa fiche.
 *
 * On ne passe pas par /api/coach/clientes : cette liste-là ne renvoie que les
 * clientes assignées au compte connecté, donc rien du tout pour un admin — et
 * l'en-tête restait sans nom.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }
  const admin = createSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(id);
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Cliente introuvable" }, { status: 404 });
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("prenom, nom, statut, date_demarrage, acces_app")
    .eq("user_id", id)
    .maybeSingle();

  return NextResponse.json({
    cliente: {
      id,
      email: authData.user.email ?? "",
      prenom: profile?.prenom ?? null,
      nom: profile?.nom ?? null,
      statut: profile?.statut ?? "active",
      // null = jamais renseigné = accès autorisé (même défaut que l'API admin)
      acces_app: profile?.acces_app !== false,
      date_demarrage: profile?.date_demarrage ?? null,
    },
  });
}
