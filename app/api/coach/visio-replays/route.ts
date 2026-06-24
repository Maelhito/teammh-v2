import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess, isCoachOnly } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const VALID_CATEGORIES = ["boost_mental", "visio_sport", "visio_stretching"] as const;

export async function GET() {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("visio_replays")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replays: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { categorie, video_url, titre } = await req.json();
  if (!categorie || !video_url)
    return NextResponse.json({ error: "categorie et video_url requis" }, { status: 400 });
  if (!VALID_CATEGORIES.includes(categorie))
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("visio_replays")
    .insert({ categorie, video_url, titre: titre || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replay: data });
}

export async function DELETE(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (isCoachOnly(user)) return NextResponse.json({ error: "Seul l'admin peut supprimer une vidéo de groupe." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("visio_replays").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
