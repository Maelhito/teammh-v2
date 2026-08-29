import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * « Voir comme cliente » : pose le cookie d'aperçu et emmène directement le
 * coach sur l'écran d'accueil de la cliente, tel qu'elle le voit à cet instant.
 *
 * C'est un GET, donc un simple lien : le coach clique, le navigateur navigue.
 * L'ancienne version faisait un POST puis un `window.open()` — déclenché après
 * deux requêtes, il n'était plus rattaché au clic et les navigateurs le
 * bloquaient comme une pop-up. D'où le « je clique et rien ne s'ouvre ».
 *
 * La destination est décidée ici, côté serveur, car elle dépend de l'offre de
 * la cliente : l'app TTL (/ttl) n'est pas l'app TTM (/dashboard).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coach = await checkCoachAccess();
  if (!coach) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  if (!(await coachPeutVoirCliente(coach, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: offreRow } = await admin
    .from("offres_clientes")
    .select("offre")
    .eq("user_id", id)
    .maybeSingle();

  const cible = offreRow?.offre === "TTL" ? "/ttl" : "/dashboard";

  const response = NextResponse.redirect(new URL(cible, request.url));
  response.cookies.set("preview_user_id", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4h
  });

  return response;
}
