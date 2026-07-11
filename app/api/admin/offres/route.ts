import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getOffresMap, upsertOffre } from "@/lib/offers/queries";
import { OFFRE_ORDER, type Offre } from "@/lib/offers/types";

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

  const offreMap = await getOffresMap(admin, clientIds);

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
  if (!user_id || !OFFRE_ORDER.includes(offre)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const result = await upsertOffre(admin, {
    user_id,
    offre: offre as Offre,
    confirmed: !!confirmed,
    actorEmail: user?.email ?? null,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("needsConfirmation" in result) {
    return NextResponse.json({ needsConfirmation: true, hors_ordre: true, offre_avant: result.offreAvant });
  }
  return NextResponse.json({ success: true });
}
