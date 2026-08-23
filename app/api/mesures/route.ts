import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { CHAMPS } from "@/lib/mesures";
import { aujourdhuiDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

export const dynamic = "force-dynamic";

/** Historique des mesures de la cliente connectée */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mesures")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mesures: data ?? [] });
}

/** Enregistre une prise de mesures (remplace celle du même jour) */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  // Date : aujourd'hui par défaut, jamais dans le futur — dans le fuseau DE LA
  // CLIENTE, sinon une saisie du matin à Nouméa se voit refusée comme "future"
  // par un serveur encore sur la veille en UTC.
  const aujourdhui = aujourdhuiDans(await getFuseau(user.id));
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : aujourdhui;
  if (date > aujourdhui) {
    return NextResponse.json({ error: "La date ne peut pas être dans le futur." }, { status: 400 });
  }

  // Valeurs numériques uniquement, sinon null
  const valeurs: Record<string, number | null> = {};
  for (const { champ } of CHAMPS) {
    const brut = body[champ];
    if (brut === null || brut === undefined || brut === "") {
      valeurs[champ] = null;
      continue;
    }
    const n = Number(String(brut).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > 500) {
      return NextResponse.json({ error: `Valeur invalide pour "${champ}".` }, { status: 400 });
    }
    valeurs[champ] = Math.round(n * 10) / 10;
  }

  const auMoinsUne = Object.values(valeurs).some((v) => v !== null);
  if (!auMoinsUne) {
    return NextResponse.json({ error: "Renseigne au moins une mesure." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mesures").upsert(
    {
      user_id: user.id,
      date,
      ...valeurs,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** Supprime une prise de mesures */
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mesures").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
