import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { TTL_MOTIFS_ARRET } from "@/lib/ttl-resiliation";

/**
 * Enregistre le questionnaire d'arrêt. Ne bloque JAMAIS la cliente : si
 * l'enregistrement échoue (table pas encore créée, panne…), on répond « ok »
 * quand même — elle doit pouvoir atteindre le portail Stripe quoi qu'il arrive.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // corps vide : rien à enregistrer
  }

  const motifs = Array.isArray(body.motifs)
    ? body.motifs.filter((m): m is string => typeof m === "string" && TTL_MOTIFS_ARRET.includes(m)).slice(0, 10)
    : [];
  const satisfaction = Number.isInteger(body.satisfaction) && (body.satisfaction as number) >= 1 && (body.satisfaction as number) <= 5
    ? (body.satisfaction as number)
    : null;
  const commentaire = typeof body.commentaire === "string" ? body.commentaire.trim().slice(0, 2000) || null : null;
  const reviendrait = ["oui", "peut_etre", "non"].includes(body.reviendrait as string) ? (body.reviendrait as string) : null;

  if (motifs.length || satisfaction || commentaire || reviendrait) {
    try {
      const { error } = await createSupabaseAdminClient().from("ttl_resiliations").insert({
        user_id: user.id,
        motifs,
        satisfaction,
        commentaire,
        reviendrait,
      });
      if (error) console.error("[ttl-resiliation] enregistrement échoué", error.message);
    } catch (err) {
      console.error("[ttl-resiliation] enregistrement échoué", err);
    }
  }

  return NextResponse.json({ ok: true });
}
