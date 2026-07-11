import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_BUCKETS = ["tts-images", "tts-docs"];

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { bucket, storagePath } = await request.json();
  if (!ALLOWED_BUCKETS.includes(bucket) || !storagePath) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl, name: String(storagePath).replace(/^\d+-/, "") });
}
