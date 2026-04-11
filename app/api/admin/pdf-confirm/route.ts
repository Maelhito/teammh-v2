import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAll } from "@/lib/push";
import { getModuleBySlug } from "@/lib/modules";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

// Appelé après l'upload direct navigateur → Supabase Storage
// Met à jour modules_content avec l'URL publique
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
  const urlField = isSlot2 ? "pdf_url_2" : "pdf_url";
  const nameField = isSlot2 ? "pdf_name_2" : "pdf_name";
  const storagePath = isSlot2 ? `${slug}/slot2/${filename}` : `${slug}/${filename}`;

  const admin = createSupabaseAdminClient();

  const {
    data: { publicUrl },
  } = admin.storage.from("module-pdfs").getPublicUrl(storagePath);

  const { error: dbError } = await admin
    .from("modules_content")
    .upsert(
      { slug, [urlField]: publicUrl, [nameField]: filename },
      { onConflict: "slug" }
    );

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

  return NextResponse.json({ success: true, url: publicUrl, name: filename, slot });
}
