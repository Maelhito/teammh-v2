import { NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();

  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clientes = users.filter(u =>
    u.email !== "mael.ld@hotmail.fr" &&
    (u.user_metadata?.role ?? "cliente") === "cliente"
  );

  const ids = clientes.map(u => u.id);
  if (!ids.length) return NextResponse.json({ clientes: [] });

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom, statut, date_demarrage")
    .in("user_id", ids);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));

  const result = clientes.map(u => ({
    id: u.id,
    email: u.email ?? "",
    prenom: profileMap[u.id]?.prenom ?? null,
    nom: profileMap[u.id]?.nom ?? null,
    statut: profileMap[u.id]?.statut ?? "active",
    date_demarrage: profileMap[u.id]?.date_demarrage ?? null,
  }));

  return NextResponse.json({ clientes: result });
}
