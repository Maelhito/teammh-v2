import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { ALL_FIELDS, OBJECTIF_FIELDS } from "@/lib/questionnaire-demarrage";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";

/** Réponses de la cliente connectée */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questionnaire_demarrage")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Table absente (migration pas encore lancée) → formulaire vierge
  if (error && !isMissingTableError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ questionnaire: error ? null : (data ?? null) });
}

/**
 * Enregistre les réponses. Les 4 objectifs sont recopiés dans user_profiles
 * (update ciblé : ne touche pas prénom/nom/date de démarrage).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  // On ne retient que les champs connus
  const answers: Record<string, string | null> = {};
  for (const f of ALL_FIELDS) {
    const v = body[f];
    answers[f] = typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("questionnaire_demarrage").upsert(
    {
      user_id: user.id,
      ...answers,
      completed_at: body.completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Synchro des objectifs vers le profil de la cliente
  const objectifs = Object.fromEntries(OBJECTIF_FIELDS.map((f) => [f, answers[f]]));
  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const syncRes = existingProfile
    ? await admin
        .from("user_profiles")
        .update({ ...objectifs, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
    : await admin.from("user_profiles").insert({ user_id: user.id, ...objectifs });

  if (syncRes.error) {
    return NextResponse.json(
      { error: `Réponses enregistrées, mais synchro profil échouée : ${syncRes.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
