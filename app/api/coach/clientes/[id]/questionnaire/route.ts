import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";
import { isAdminUser } from "@/lib/is-admin";
import { ALL_FIELDS, OBJECTIF_FIELDS } from "@/lib/questionnaire-demarrage";

/** Questionnaire de démarrage d'une cliente — lecture pour le coach, écriture pour les admins */
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

/**
 * Modifie les réponses au nom de la cliente — réservé aux admins (Mael, Julie).
 * Même synchro des objectifs vers user_profiles que côté cliente.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Seul un admin peut modifier le questionnaire de démarrage." }, { status: 403 });
  }

  const { id: clienteId } = await params;
  if (!(await coachPeutVoirCliente(user, clienteId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const body = await request.json();
  const answers: Record<string, string | null> = {};
  for (const f of ALL_FIELDS) {
    const v = body[f];
    answers[f] = typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("questionnaire_demarrage").upsert(
    { user_id: clienteId, ...answers, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const objectifs = Object.fromEntries(OBJECTIF_FIELDS.map((f) => [f, answers[f]]));
  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", clienteId)
    .maybeSingle();

  const syncRes = existingProfile
    ? await admin
        .from("user_profiles")
        .update({ ...objectifs, updated_at: new Date().toISOString() })
        .eq("user_id", clienteId)
    : await admin.from("user_profiles").insert({ user_id: clienteId, ...objectifs });

  if (syncRes.error) {
    return NextResponse.json(
      { error: `Réponses enregistrées, mais synchro profil échouée : ${syncRes.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
