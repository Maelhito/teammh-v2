import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
