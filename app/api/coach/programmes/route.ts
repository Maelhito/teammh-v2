import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess, refusSiCoach } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("programmes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programmes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await req.json();
  const { nom, categorie, niveau, duree_semaines, description, image_url, duplication } = body;
  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  // Créer un programme de zéro reste ouvert à tous. Dupliquer un modèle
  // existant, non : c'est une écriture sur la bibliothèque partagée, et rien
  // ne distingue les deux côté base — d'où ce drapeau posé par l'appelant.
  if (duplication) {
    const refus = refusSiCoach(user, "dupliquer un programme");
    if (refus) return refus;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("programmes")
    .insert({ nom: nom.trim(), categorie, niveau, duree_semaines: duree_semaines ?? 4, description, image_url: image_url || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programme: data }, { status: 201 });
}
