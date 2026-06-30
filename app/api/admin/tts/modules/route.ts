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
  const { data: modules, error } = await admin
    .from("tts_modules")
    .select("*")
    .order("ordre", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: videos } = await admin
    .from("tts_modules_videos")
    .select("*")
    .order("ordre", { ascending: true });

  const result = (modules ?? []).map((m) => ({
    ...m,
    videos: (videos ?? []).filter((v) => v.module_id === m.id),
  }));

  return NextResponse.json({ modules: result });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { titre, ordre } = await request.json();
  if (!titre) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tts_modules")
    .insert({ titre: String(titre).slice(0, 200), ordre: Number(ordre) || 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ module: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("tts_modules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
