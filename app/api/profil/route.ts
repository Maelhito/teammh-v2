import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const {
    prenom,
    nom,
    objectif_4mois_poids,
    objectif_4mois_bienetre,
    objectif_12mois_poids,
    objectif_12mois_bienetre,
    date_demarrage,
    programme_type,
    programme_duree,
  } = body;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        prenom: prenom || null,
        nom: nom || null,
        objectif_4mois_poids: objectif_4mois_poids || null,
        objectif_4mois_bienetre: objectif_4mois_bienetre || null,
        objectif_12mois_poids: objectif_12mois_poids || null,
        objectif_12mois_bienetre: objectif_12mois_bienetre || null,
        date_demarrage: date_demarrage || null,
        programme_type: programme_type || "N1",
        programme_duree: programme_duree || "16_semaines",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
