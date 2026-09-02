import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { estFuseauValide } from "@/lib/temps";
import { setFuseau } from "@/lib/temps-serveur";

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { prenom, nom, specialite, bio, telephone, lien_zoom } = await req.json();

  const { error } = await supabase.auth.updateUser({
    data: { prenom, nom, specialite, bio, telephone, lien_zoom },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Le lien Zoom vivait ici seulement, dans le compte du coach. Or tout le
  // reste de l'app — le calendrier admin qui pré-remplit un rendez-vous, la
  // fiche cliente, le bouton « Rejoindre Zoom » — lit team_members.lien_zoom.
  // Un coach qui renseignait son lien dans son profil ne le voyait donc
  // arriver nulle part. On recopie le lien dans ses fiches d'équipe : une
  // seule saisie, une seule source de vérité.
  const teamMemberIds: string[] = Array.isArray(user.user_metadata?.team_member_ids)
    ? user.user_metadata.team_member_ids
    : [];

  if (teamMemberIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { error: erreurEquipe } = await admin
      .from("team_members")
      .update({ lien_zoom: lien_zoom ? String(lien_zoom).slice(0, 500) : null })
      .in("id", teamMemberIds);

    // Le profil est enregistré : on ne fait pas échouer la sauvegarde, mais on
    // le dit, sinon le coach croirait son lien diffusé alors qu'il ne l'est pas.
    if (erreurEquipe) {
      return NextResponse.json({
        success: true,
        avertissement: "Profil enregistré, mais le lien Zoom n'a pas pu être diffusé à ton équipe.",
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { timezone, auto } = await req.json();
  if (!estFuseauValide(timezone)) {
    return NextResponse.json({ error: "Fuseau horaire invalide" }, { status: 400 });
  }

  // Le fuseau vivait ici dans user_metadata, sans que rien ne le lise. Il fait
  // désormais partie de la source unique (user_profiles), comme pour tout le
  // monde — un coach qui bouge de fuseau en Australie compte autant qu'une
  // cliente en vacances.
  const resultat = await setFuseau(user.id, timezone, auto !== false);
  return NextResponse.json({ success: true, ...resultat });
}
