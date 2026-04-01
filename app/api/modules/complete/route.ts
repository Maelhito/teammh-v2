import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { getModules } from "@/lib/modules";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug } = await request.json();
  if (!slug) {
    return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("module_completions")
    .upsert(
      { user_id: user.id, module_slug: slug, completed_at: new Date().toISOString() },
      { onConflict: "user_id,module_slug" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notification immédiate pour module 3 (se débloque quand module-1 ET module-2 sont validés)
  const modules = getModules();
  const slugs = modules.map((m) => m.slug);
  const isModule1 = slug === slugs[0];
  const isModule2 = slug === slugs[1];

  if (isModule1 || isModule2) {
    const otherSlug = isModule1 ? slugs[1] : slugs[0];
    const { data: otherCompletion } = await admin
      .from("module_completions")
      .select("module_slug")
      .eq("user_id", user.id)
      .eq("module_slug", otherSlug)
      .single();

    if (otherCompletion) {
      await sendPushToUser(user.id, {
        title: "🔓 Module disponible !",
        body: `Ton module "${modules[2].title}" est maintenant accessible.`,
        url: `/modules/${slugs[2]}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}
