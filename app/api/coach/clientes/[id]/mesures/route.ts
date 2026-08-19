import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { signPhotos } from "@/lib/photos-progression";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";
import { CHAMPS } from "@/lib/mesures";

export const dynamic = "force-dynamic";

/** Mesures et photos d'une cliente — lecture pour le coach */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;
  const admin = createSupabaseAdminClient();

  const [mesuresRes, photosRes] = await Promise.all([
    admin.from("mesures").select("*").eq("user_id", clienteId).order("date", { ascending: true }),
    admin
      .from("photos_progression")
      .select("id, date, angle, path")
      .eq("user_id", clienteId)
      .order("date", { ascending: true }),
  ]);

  // Tables absentes (migration sql/mesures.sql pas encore lancée) → listes vides
  if (mesuresRes.error && !isMissingTableError(mesuresRes.error)) {
    return NextResponse.json({ error: mesuresRes.error.message }, { status: 500 });
  }
  if (photosRes.error && !isMissingTableError(photosRes.error)) {
    return NextResponse.json({ error: photosRes.error.message }, { status: 500 });
  }

  const photos = photosRes.error ? [] : await signPhotos(admin, photosRes.data ?? []);

  return NextResponse.json({
    mesures: mesuresRes.error ? [] : (mesuresRes.data ?? []),
    photos,
  });
}

/**
 * Saisie d'une prise de mesures par le coach — pensée pour la reprise
 * d'historiques venant d'anciennes applis : aucune contrainte de date
 * (passé libre), aucun champ obligatoire, on enregistre ce qu'on a.
 * Une seule ligne par date : ré-enregistrer la même date la remplace.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Date manquante ou invalide (AAAA-MM-JJ)." }, { status: 400 });
  }
  const date = body.date;

  const valeurs: Record<string, number | null> = {};
  for (const { champ, label } of CHAMPS) {
    const brut = body[champ];
    if (brut === null || brut === undefined || String(brut).trim() === "") {
      valeurs[champ] = null;
      continue;
    }
    const n = Number(String(brut).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: `Valeur invalide pour "${label}".` }, { status: 400 });
    }
    valeurs[champ] = Math.round(n * 10) / 10;
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  if (!Object.values(valeurs).some((v) => v !== null) && !note) {
    return NextResponse.json({ error: "Renseigne au moins une mesure ou une note." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mesures").upsert(
    { user_id: clienteId, date, ...valeurs, note, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** Supprime une prise de mesures de cette cliente */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;
  const mesureId = request.nextUrl.searchParams.get("mesureId");
  if (!mesureId) return NextResponse.json({ error: "mesureId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mesures").delete().eq("id", mesureId).eq("user_id", clienteId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
