import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await request.formData();
  const slug = formData.get("slug") as string;
  const file = formData.get("file") as File;

  if (!slug || !file) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const fileBuffer = await file.arrayBuffer();
  const storagePath = `${slug}/${file.name}`;

  const { error: uploadError } = await admin.storage
    .from("module-pdfs")
    .upload(storagePath, fileBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from("module-pdfs")
    .getPublicUrl(storagePath);

  const { error: dbError } = await admin
    .from("modules_content")
    .upsert({ slug, pdf_url: publicUrl, pdf_name: file.name }, { onConflict: "slug" });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true, url: publicUrl, name: file.name });
}
