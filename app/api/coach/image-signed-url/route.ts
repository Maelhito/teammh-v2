import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const BUCKET = "coach-images";

export async function POST(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { filename } = await req.json();
  if (!filename) return NextResponse.json({ error: "filename requis" }, { status: 400 });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp"];
  if (!allowed.includes(ext))
    return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP)" }, { status: 400 });

  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const admin = createSupabaseAdminClient();

  // Crée le bucket si nécessaire
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 20 * 1024 * 1024 });
  }

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
    publicUrl,
  });
}
