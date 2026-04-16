import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";
const VALID_CATEGORIES = ["boost_mental", "visio_sport", "visio_stretching"] as const;

async function requireAdmin(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// GET : lister les replays (optionnel : filtrer par catégorie)
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const categorie = request.nextUrl.searchParams.get("categorie");
  const admin = createSupabaseAdminClient();

  let query = admin.from("visio_replays").select("*").order("created_at", { ascending: true });
  if (categorie) query = query.eq("categorie", categorie);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replays: data ?? [] });
}

// POST : ajouter un replay
export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { categorie, video_url, titre } = await request.json();

  if (!categorie || !video_url) {
    return NextResponse.json({ error: "categorie et video_url requis" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(categorie)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("visio_replays")
    .insert({ categorie, video_url, titre: titre || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replay: data });
}

// DELETE : supprimer un replay
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("visio_replays").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
