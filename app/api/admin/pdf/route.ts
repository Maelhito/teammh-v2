import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAll } from "@/lib/push";
import { getModuleBySlug } from "@/lib/modules";

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
  const slot = (formData.get("slot") as string) ?? "1";

  if (!slug || !file) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const isSlot2 = slot === "2";
  const urlField = isSlot2 ? "pdf_url_2" : "pdf_url";
  const nameField = isSlot2 ? "pdf_name_2" : "pdf_name";
  const storagePath = isSlot2 ? `${slug}/slot2/${file.name}` : `${slug}/${file.name}`;

  const admin = createSupabaseAdminClient();
  const fileBuffer = await file.arrayBuffer();

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
    .upsert({ slug, [urlField]: publicUrl, [nameField]: file.name }, { onConflict: "slug" });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  if (!isSlot2) {
    const moduleData = getModuleBySlug(slug);
    const moduleTitle = moduleData?.title ?? slug;
    await sendPushToAll({
      title: "📄 Nouveau document disponible",
      body: `Un document PDF est disponible dans le module "${moduleTitle}".`,
      url: `/modules/${slug}`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, url: publicUrl, name: file.name, slot });
}
