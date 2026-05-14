import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

async function checkAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? "cliente";
  if (role !== "coach" && role !== "admin" && user.email !== ADMIN_EMAIL) return null;
  return user;
}

export async function GET() {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = (users ?? []).filter(u => u.email !== ADMIN_EMAIL);
  const clientIds = clients.map(u => u.id);

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom, statut")
    .in("user_id", clientIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));

  return NextResponse.json({
    clients: clients.map(u => ({
      id: u.id,
      email: u.email ?? "",
      prenom: profileMap[u.id]?.prenom ?? null,
      nom: profileMap[u.id]?.nom ?? null,
      statut: profileMap[u.id]?.statut ?? "active",
    })),
  });
}
