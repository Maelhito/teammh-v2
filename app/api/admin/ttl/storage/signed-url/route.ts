import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_BUCKETS = ["ttl-images", "ttl-docs"];

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { bucket, filename } = await request.json();
  if (!ALLOWED_BUCKETS.includes(bucket) || !filename) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}-${safeFilename}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token: data.token, storagePath, bucket });
}
