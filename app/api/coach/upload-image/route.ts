import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const maxDuration = 60;
// Augmente la taille max du body pour Next.js App Router
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  if (file.size > 20 * 1024 * 1024)
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp"];
  if (!allowed.includes(ext))
    return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP)" }, { status: 400 });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from("coach-images")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("coach-images").getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
