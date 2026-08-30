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

  const { titre } = await request.json();
  const nom = typeof titre === "string" ? titre.trim() : "";
  if (!nom) return NextResponse.json({ error: "Le nom du programme est requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Le numéro d'ordre n'est plus saisi à la main : il sert uniquement, en
  // interne, à savoir quel programme s'ouvre à quel mois d'abonnement. On le
  // place à la suite du dernier programme créé.
  const { data: dernier } = await admin
    .from("ttl_programmes")
    .select("numero_mois")
    .order("numero_mois", { ascending: false })
    .limit(1)
    .maybeSingle();
  const numeroMois = (dernier?.numero_mois ?? 0) + 1;

  const { data, error } = await admin
    .from("ttl_programmes")
    .insert({ numero_mois: numeroMois, titre: nom.slice(0, 200) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  after(() => sendPushToAllTtl({
    title: "🏋️ Nouveau programme disponible !",
    body: `${data.titre} vient d'arriver dans ta partie sport.`,
    url: "/ttl/sport",
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
