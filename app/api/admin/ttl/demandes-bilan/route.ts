import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data: demandes, error } = await admin
    .from("ttl_demandes_bilan")
    .select("*")
    .eq("traite", false)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((demandes ?? []).map((d) => d.user_id))];
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

  const result = (demandes ?? []).map((d) => ({
    ...d,
    prenom: profileMap[d.user_id]?.prenom ?? null,
    nom: profileMap[d.user_id]?.nom ?? null,
  }));

  return NextResponse.json({ demandes: result });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_demandes_bilan").update({ traite: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
