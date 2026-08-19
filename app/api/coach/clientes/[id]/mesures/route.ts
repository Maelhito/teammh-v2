import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { clienteRevoquee } from "@/lib/acces-app";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { signPhotos } from "@/lib/photos-progression";
import { isMissingTableError } from "@/lib/questionnaire-missing-table";

export const dynamic = "force-dynamic";

/** Mesures et photos d'une cliente — lecture seule pour le coach */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;
  if (await clienteRevoquee(clienteId)) return NextResponse.json({ error: "Accès révoqué" }, { status: 403 });
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
