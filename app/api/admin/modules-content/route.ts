import { isAdminUser } from "@/lib/is-admin";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";



export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
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
