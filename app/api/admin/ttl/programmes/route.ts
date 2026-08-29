import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAllTtl } from "@/lib/push";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data: programmes, error } = await admin
    .from("ttl_programmes")
    .select("*")
    .order("numero_mois", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: videos } = await admin
    .from("ttl_videos")
    .select("*")
    .order("ordre", { ascending: true });

  const result = (programmes ?? []).map((p) => ({
    ...p,
    videos: (videos ?? []).filter((v) => v.programme_id === p.id),
  }));

  return NextResponse.json({ programmes: result });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { numero_mois, titre } = await request.json();
  if (!numero_mois) return NextResponse.json({ error: "numero_mois requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_programmes")
    .insert({ numero_mois: Number(numero_mois), titre: titre ? String(titre).slice(0, 200) : null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  after(() => sendPushToAllTtl({
    title: "🏋️ Nouveau mois de sport disponible !",
    body: `Mois ${data.numero_mois}${data.titre ? ` — ${data.titre}` : ""} vient d'arriver dans ta bibliothèque.`,
    url: "/ttl/bibliotheque?tab=seances",
  }));

  return NextResponse.json({ programme: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_programmes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
