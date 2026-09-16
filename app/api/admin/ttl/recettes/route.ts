import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAllTtl } from "@/lib/push";
import { categorieAvecGout, TTL_RECETTE_CALORIES, TTL_RECETTE_GOUT_LABELS } from "@/lib/ttl";
import type { TtlRecetteCategorie, TtlRecetteGout } from "@/lib/ttl";

const COLONNES = "id, titre, photo_url, miniature_url, categorie, gout, calories, created_at";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

/** Vérifie la combinaison catégorie / goût / calories, ou renvoie un message d'erreur. */
function classement(body: { categorie?: unknown; gout?: unknown; calories?: unknown }):
  { categorie: TtlRecetteCategorie; gout: TtlRecetteGout | null; calories: number } | string {
  const categorie = body.categorie as TtlRecetteCategorie;
  if (!(categorie in TTL_RECETTE_CALORIES)) return "Catégorie invalide";
  const calories = Number(body.calories);
  if (!TTL_RECETTE_CALORIES[categorie].includes(calories)) return "Tranche de calories invalide pour cette catégorie";
  if (!categorieAvecGout(categorie)) return { categorie, gout: null, calories };
  const gout = body.gout as TtlRecetteGout;
  if (!(gout in TTL_RECETTE_GOUT_LABELS)) return "Précise sucré ou salé";
  return { categorie, gout, calories };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_recettes")
    .select(COLONNES)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recettes: data ?? [] });
}

/** Ajoute une ou plusieurs fiches photo, chacune avec son propre rangement. */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await request.json();
  const fiches: Record<string, unknown>[] = Array.isArray(body.recettes) ? body.recettes.slice(0, 100) : [];
  if (fiches.length === 0) return NextResponse.json({ error: "Au moins une photo est requise" }, { status: 400 });

  const lignes = [];
  for (const f of fiches) {
    if (!f?.photo_url) return NextResponse.json({ error: "Photo manquante" }, { status: 400 });
    const rang = classement(f);
    if (typeof rang === "string") return NextResponse.json({ error: `${f.titre ?? "Recette"} : ${rang}` }, { status: 400 });
    lignes.push({
      titre: String(f.titre || "Recette").slice(0, 200),
      photo_url: String(f.photo_url).slice(0, 500),
      miniature_url: f.miniature_url ? String(f.miniature_url).slice(0, 500) : null,
      ...rang,
    });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("ttl_recettes").insert(lignes).select(COLONNES);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.notifier) {
    const nb = data.length;
    after(() => sendPushToAllTtl({
      title: nb > 1 ? `🥗 ${nb} nouvelles recettes !` : "🥗 Nouvelle recette disponible !",
      body: nb > 1 ? "De nouvelles recettes t'attendent dans ton onglet Alimentation." : `${data[0].titre} vient d'être ajoutée à ton onglet Alimentation.`,
      url: "/ttl/alimentation",
    }));
  }

  return NextResponse.json({ recettes: data });
}

/** Change le rangement d'une fiche (catégorie, sucré / salé, calories). */
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const rang = classement(body);
  if (typeof rang === "string") return NextResponse.json({ error: rang }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("ttl_recettes").update(rang).eq("id", body.id).select(COLONNES).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recette: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_recettes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
