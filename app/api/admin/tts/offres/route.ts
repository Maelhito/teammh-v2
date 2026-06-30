import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ORDRE = ["TTS", "TTM", "TTL"];

function estHorsOrdre(avant: string | null, apres: string) {
  if (!avant) return false; // première affectation : jamais hors ordre
  return ORDRE.indexOf(apres) !== ORDRE.indexOf(avant) + 1;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({
    perPage: 500,
  });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const clients = users.filter((u) => !isAdminUser(u));
  const clientIds = clients.map((u) => u.id);

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom")
    .in("user_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

  const { data: offres } = await admin
    .from("offres_clientes")
    .select("user_id, offre, date_debut")
    .in("user_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const offreMap = Object.fromEntries((offres ?? []).map((o) => [o.user_id, o]));

  const result = clients.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    prenom: profileMap[u.id]?.prenom ?? null,
    nom: profileMap[u.id]?.nom ?? null,
    offre: offreMap[u.id]?.offre ?? null,
    date_debut: offreMap[u.id]?.date_debut ?? null,
  }));

  return NextResponse.json({ clients: result });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { user_id, offre, confirmed } = await request.json();
  if (!user_id || !ORDRE.includes(offre)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("offres_clientes")
    .select("offre")
    .eq("user_id", user_id)
    .maybeSingle();

  const offreAvant = existing?.offre ?? null;
  const horsOrdre = estHorsOrdre(offreAvant, offre);

  if (offreAvant === offre) {
    return NextResponse.json({ error: "Cette cliente est déjà sur cette offre" }, { status: 400 });
  }

  if (horsOrdre && !confirmed) {
    return NextResponse.json({ needsConfirmation: true, hors_ordre: true, offre_avant: offreAvant });
  }

  const { error: upsertError } = await admin
    .from("offres_clientes")
    .upsert(
      { user_id, offre, date_debut: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  const { error: histError } = await admin.from("offres_clientes_historique").insert({
    user_id,
    offre_avant: offreAvant,
    offre_apres: offre,
    hors_ordre: horsOrdre,
    confirmed_by: user?.email ?? null,
  });
  if (histError) return NextResponse.json({ error: histError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
