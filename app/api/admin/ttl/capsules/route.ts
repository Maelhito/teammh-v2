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
  const { data, error } = await admin
    .from("ttl_capsules")
    .select("*")
    .order("ordre", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ capsules: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { titre, lien_youtube, description, duree_minutes, cover_url, ordre } = await request.json();
  if (!titre || !lien_youtube) {
    return NextResponse.json({ error: "titre et lien_youtube requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_capsules")
    .insert({
      titre: String(titre).slice(0, 200),
      lien_youtube: String(lien_youtube).slice(0, 500),
      description: description ? String(description).slice(0, 2000) : null,
      duree_minutes: duree_minutes ? Number(duree_minutes) : null,
      cover_url: cover_url ? String(cover_url).slice(0, 500) : null,
      ordre: Number(ordre) || 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aucune notification : les capsules ne sont plus affichées dans l'app cliente
  // (barre du bas : Accueil, Sport, Alimentation, Profil). Prévenir toutes les
  // clientes d'un contenu qu'elles ne peuvent pas ouvrir n'aurait pas de sens.
  // À rétablir le jour où les capsules retrouvent une place côté cliente.

  return NextResponse.json({ capsule: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_capsules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
