import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAllTts } from "@/lib/push";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tts_recettes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recettes: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { titre, photo_url, texte, ingredients, macros, categorie, duree_minutes } = await request.json();
  if (!titre) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const CATEGORIES = ["petit_dej", "dejeuner", "diner", "collation"];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tts_recettes")
    .insert({
      titre: String(titre).slice(0, 200),
      photo_url: photo_url ? String(photo_url).slice(0, 500) : null,
      texte: texte ? String(texte).slice(0, 5000) : null,
      ingredients: ingredients ? String(ingredients).slice(0, 3000) : null,
      macros: macros ?? null,
      categorie: CATEGORIES.includes(categorie) ? categorie : null,
      duree_minutes: duree_minutes ? Number(duree_minutes) : null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  after(() => sendPushToAllTts({
    title: "🥗 Nouvelle recette disponible !",
    body: `${data.titre} vient d'être ajoutée à ta bibliothèque.`,
    url: "/tts/bibliotheque?tab=recettes",
  }));

  return NextResponse.json({ recette: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("tts_recettes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
