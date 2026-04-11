import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({
    perPage: 500,
  });

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const clients = users.filter((u) => u.email !== ADMIN_EMAIL);
  const clientIds = clients.map((u) => u.id);

  if (!clientIds.length) return NextResponse.json({ users: [] });

  const [{ data: profiles }, { data: completions }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("user_id, prenom, nom, statut, date_demarrage, acces_app, programme_type, programme_duree")
      .in("user_id", clientIds),
    admin
      .from("module_completions")
      .select("user_id")
      .in("user_id", clientIds),
  ]);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  const completionCount: Record<string, number> = {};
  for (const c of completions ?? []) {
    completionCount[c.user_id] = (completionCount[c.user_id] ?? 0) + 1;
  }

  const totalModules = getModules().length;

  const result = clients.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    prenom: profileMap[u.id]?.prenom ?? null,
    nom: profileMap[u.id]?.nom ?? null,
    statut: (profileMap[u.id]?.statut ?? "active") as "active" | "pause" | "terminee",
    date_demarrage: profileMap[u.id]?.date_demarrage ?? null,
    completedCount: completionCount[u.id] ?? 0,
    totalModules,
    acces_app: profileMap[u.id]?.acces_app ?? true,
    programme_type: profileMap[u.id]?.programme_type ?? "N1",
    programme_duree: profileMap[u.id]?.programme_duree ?? "16_semaines",
  }));

  return NextResponse.json({ users: result });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, action } = body;

  if (!userId) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (action === "toggle_access") {
    const { acces_app } = body;
    if (typeof acces_app !== "boolean") {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }
    const { error } = await admin
      .from("user_profiles")
      .upsert(
        { user_id: userId, acces_app, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update_programme") {
    const { programme_type, programme_duree } = body;
    const validTypes = ["N1", "N2"];
    const validDurees = ["16_semaines", "6_mois", "12_mois"];
    if (!validTypes.includes(programme_type) || !validDurees.includes(programme_duree)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }
    const { error } = await admin
      .from("user_profiles")
      .upsert(
        { user_id: userId, programme_type, programme_duree, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Mise à jour du statut (comportement historique)
  const { statut } = body;
  if (!statut || !["active", "pause", "terminee"].includes(statut)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const { error } = await admin
    .from("user_profiles")
    .upsert(
      { user_id: userId, statut, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { userId, action } = await request.json();

  if (!userId || action !== "disconnect") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.signOut(userId, "global");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
