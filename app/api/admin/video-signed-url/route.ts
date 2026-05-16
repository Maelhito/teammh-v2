import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const BUCKET = "visio-videos";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { categorie, filename } = await request.json();
  if (!categorie || !filename) return NextResponse.json({ error: "categorie et filename requis" }, { status: 400 });

  // Nom de fichier sécurisé + timestamp pour éviter les conflits
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${categorie}/${Date.now()}_${safe}`;

  const admin = createSupabaseAdminClient();

  // Crée le bucket si nécessaire (public = accessible sans auth)
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 500 * 1024 * 1024 });
  }

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    storagePath,
    publicUrl,
  });
}
