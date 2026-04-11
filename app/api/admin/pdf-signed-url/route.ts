import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

// Génère une signed upload URL Supabase pour upload direct navigateur → Supabase Storage
// Contourne la limite 4.5 MB de Vercel sur les routes Next.js
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug, filename, slot } = await request.json();

  if (!slug || !filename) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const isSlot2 = slot === "2";
  const storagePath = isSlot2 ? `${slug}/slot2/${filename}` : `${slug}/${filename}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("module-pdfs")
    .createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    storagePath,
  });
}
