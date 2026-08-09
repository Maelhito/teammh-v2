import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { BUCKET_PHOTOS, ensurePhotoBucket, signPhotos } from "@/lib/photos-progression";

export const dynamic = "force-dynamic";

const ANGLES = ["face", "profil", "dos"];
const EXT_AUTORISEES = ["jpg", "jpeg", "png", "webp"];
const TAILLE_MAX = 8 * 1024 * 1024; // 8 Mo

/** Photos de la cliente connectée, avec URLs signées temporaires */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("photos_progression")
    .select("id, date, angle, path")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: await signPhotos(admin, data ?? []) });
}

/** Upload d'une photo de progression */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const angle = String(form.get("angle") ?? "");
  const dateBrute = String(form.get("date") ?? "");

  if (!file) return NextResponse.json({ error: "Photo manquante" }, { status: 400 });
  if (!ANGLES.includes(angle)) return NextResponse.json({ error: "Angle invalide" }, { status: 400 });
  if (file.size > TAILLE_MAX) {
    return NextResponse.json({ error: "Photo trop lourde (max 8 Mo)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!EXT_AUTORISEES.includes(ext)) {
    return NextResponse.json({ error: "Format non supporté (JPG, PNG, WEBP)" }, { status: 400 });
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateBrute) && dateBrute <= aujourdhui ? dateBrute : aujourdhui;

  const admin = createSupabaseAdminClient();
  await ensurePhotoBucket(admin);

  // Chemin préfixé par l'id de la cliente — cloisonne les photos entre clientes
  const path = `${user.id}/${date}-${angle}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET_PHOTOS)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: dbError } = await admin
    .from("photos_progression")
    .insert({ user_id: user.id, date, angle, path });

  if (dbError) {
    // Ne pas laisser de fichier orphelin si l'enregistrement échoue
    await admin.storage.from(BUCKET_PHOTOS).remove([path]).catch(() => {});
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Suppression d'une photo (fichier + ligne) */
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // On ne supprime que si la photo appartient bien à la cliente
  const { data: photo } = await admin
    .from("photos_progression")
    .select("path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!photo) return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });

  const { error } = await admin
    .from("photos_progression")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.storage.from(BUCKET_PHOTOS).remove([photo.path]).catch(() => {});
  return NextResponse.json({ success: true });
}
