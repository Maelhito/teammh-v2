import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";
import { nettoyerReponses, questionnaireComplet } from "@/lib/ttl-questionnaire";

/**
 * Enregistre le questionnaire de démarrage TTL de la cliente connectée.
 * Réponses partielles acceptées (elle peut revenir finir) ; le devoir n'est
 * validé (completed_at) que lorsque toutes les questions ont une réponse.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reponses = nettoyerReponses(body?.reponses);
  const complet = questionnaireComplet(reponses);
  const now = new Date().toISOString();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_questionnaire").upsert(
    { user_id: user.id, reponses, completed_at: complet ? now : null, updated_at: now },
    { onConflict: "user_id" }
  );

  if (error) {
    const message = isMissingTableError(error)
      ? "Le questionnaire n'est pas encore activé, réessaie un peu plus tard."
      : "Erreur : tes réponses n'ont pas été enregistrées, réessaie.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, complet });
}
