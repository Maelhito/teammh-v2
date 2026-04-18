import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

async function requireAdmin(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { nom, titre, lien_zoom } = await request.json();
  if (!nom || !titre) {
    return NextResponse.json({ error: "Nom et titre requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .insert({
      nom: String(nom).slice(0, 100),
      titre: String(titre).slice(0, 100),
      lien_zoom: lien_zoom ? String(lien_zoom).slice(0, 500) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
