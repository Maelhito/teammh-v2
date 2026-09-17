import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAllTtl } from "@/lib/push";
import { TTL_PLAN_CALORIES } from "@/lib/ttl";
import { supprimerFichiers } from "@/lib/ttl-stockage";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

function nettoyerUrls(liste: unknown): string[] | null {
  if (!Array.isArray(liste) || liste.length === 0 || liste.length > 200) return null;
  return liste.map((u) => String(u).slice(0, 500));
}

const COLONNES = "id, calories, numero, nb_pages, pdf_url, miniatures";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_plans_alimentaires")
    .select(COLONNES)
    .order("calories", { ascending: true })
    .order("numero", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seule la couverture sert dans l'admin : inutile de renvoyer toutes les miniatures.
  const plans = (data ?? []).map(({ miniatures, ...p }) => ({ ...p, couverture: (miniatures as string[])[0] ?? null }));
  return NextResponse.json({ plans });
}

/** Ajoute un plan (id absent) ou remplace le PDF d'un plan existant (id présent). */
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id, calories, numero, pdf_url, pages, miniatures, notifier } = await request.json();
  const pagesOk = nettoyerUrls(pages);
  const miniaturesOk = nettoyerUrls(miniatures);
  if (!pdf_url || !pagesOk || !miniaturesOk || pagesOk.length !== miniaturesOk.length) {
    return NextResponse.json({ error: "PDF et pages requis" }, { status: 400 });
  }
  const contenu = {
    pdf_url: String(pdf_url).slice(0, 500),
    pages: pagesOk,
    miniatures: miniaturesOk,
    nb_pages: pagesOk.length,
    updated_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();

  if (id) {
    const { data: ancien } = await admin.from("ttl_plans_alimentaires").select("pdf_url, pages, miniatures").eq("id", id).maybeSingle();
    const { data, error } = await admin.from("ttl_plans_alimentaires").update(contenu).eq("id", id).select(COLONNES).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Les fichiers de l'ancien PDF ne servent plus à rien.
    if (ancien) after(() => supprimerFichiers([ancien.pdf_url, ...(ancien.pages as string[]), ...(ancien.miniatures as string[])]));
    const { miniatures: m, ...plan } = data;
    return NextResponse.json({ plan: { ...plan, couverture: (m as string[])[0] ?? null } });
  }

  if (!(TTL_PLAN_CALORIES as readonly number[]).includes(Number(calories))) {
    return NextResponse.json({ error: "Apport calorique invalide" }, { status: 400 });
  }
  const num = Number(numero);
  if (!Number.isInteger(num) || num < 1 || num > 999) {
    return NextResponse.json({ error: "Numéro de plan invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("ttl_plans_alimentaires")
    .insert({ calories: Number(calories), numero: num, ...contenu })
    .select(COLONNES)
    .single();
  if (error) {
    const message = error.code === "23505" ? `Le plan N°${num} existe déjà pour ${calories} kcal` : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (notifier) {
    after(() => sendPushToAllTtl({
      title: "🥗 Nouveau plan alimentaire",
      body: `Le plan N°${data.numero} à ${data.calories} kcal est disponible dans ton onglet Alimentation.`,
      url: "/ttl/alimentation",
    }));
  }

  const { miniatures: m, ...plan } = data;
  return NextResponse.json({ plan: { ...plan, couverture: (m as string[])[0] ?? null } });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: plan, error } = await admin.from("ttl_plans_alimentaires").delete().eq("id", id).select("pdf_url, pages, miniatures").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (plan) after(() => supprimerFichiers([plan.pdf_url, ...(plan.pages as string[]), ...(plan.miniatures as string[])]));

  return NextResponse.json({ success: true });
}
