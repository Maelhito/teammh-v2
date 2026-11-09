/**
 * Connecteur Claude — réponse du formulaire « Autoriser / Refuser ».
 *
 * Revérifie tout (session du coach, client, adresse de retour) puis renvoie
 * vers Claude avec un code valable 5 minutes, lié au défi PKCE de Claude.
 * Les cookies de session sont en SameSite=Lax : un autre site ne peut pas
 * soumettre ce formulaire à la place du coach.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { estCoachOuAdmin } from "@/lib/mcp/acces";
import { lireDemande } from "@/lib/mcp/demande";
import { DUREE_CODE_S, empreinte, maintenant, signer } from "@/lib/mcp/jeton";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });

  const lecture = lireDemande(params);
  if (!lecture.ok) return new NextResponse(lecture.raison, { status: 400 });
  const { demande } = lecture;

  const retour = new URL(demande.redirectUri);
  if (demande.state !== null) retour.searchParams.set("state", demande.state);

  if (params.decision !== "autoriser") {
    retour.searchParams.set("error", "access_denied");
    return NextResponse.redirect(retour, 303);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !estCoachOuAdmin(user)) {
    return new NextResponse("Connecte-toi avec un compte coach pour autoriser Claude.", { status: 403 });
  }

  const code = signer({
    t: "code",
    u: user.id,
    r: demande.redirectUri,
    cc: demande.codeChallenge,
    ci: empreinte(demande.clientId),
    exp: maintenant() + DUREE_CODE_S,
  });
  retour.searchParams.set("code", code);
  return NextResponse.redirect(retour, 303);
}
