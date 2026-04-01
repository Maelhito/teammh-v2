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

  // 1. Tous les utilisateurs Supabase Auth
  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({
    perPage: 500,
  });

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  // Filtre l'admin
  const clients = users.filter((u) => u.email !== ADMIN_EMAIL);
  const clientIds = clients.map((u) => u.id);

  if (!clientIds.length) return NextResponse.json({ clients: [] });

  // 2. Profils
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom, statut, date_demarrage")
    .in("user_id", clientIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // 3. Nombre de modules complétés par cliente
  const { data: completions } = await admin
    .from("module_completions")
    .select("user_id")
    .in("user_id", clientIds);

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
  }));

  return NextResponse.json({ clients: result });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { userId, statut } = await request.json();

  if (!userId || !["active", "pause", "terminee"].includes(statut)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .upsert(
      { user_id: userId, statut, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
