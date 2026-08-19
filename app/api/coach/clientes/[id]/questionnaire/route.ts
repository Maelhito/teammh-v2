import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";

/** Questionnaire de démarrage d'une cliente — lecture seule pour le coach */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;
  if (!(await coachPeutVoirCliente(user, clienteId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("questionnaire_demarrage")
    .select("*")
    .eq("user_id", clienteId)
    .maybeSingle();

  // Table absente (migration pas encore lancée) → "pas encore rempli", pas une erreur
  if (error && !isMissingTableError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ questionnaire: error ? null : (data ?? null) });
}
