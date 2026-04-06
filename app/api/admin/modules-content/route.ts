import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("modules_content").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map: Record<string, unknown> = {};
  (data ?? []).forEach((row: { slug: string }) => { map[row.slug] = row; });

  return NextResponse.json(map);
}
