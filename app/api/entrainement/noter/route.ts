import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { logId, note_etoiles, note_texte, duration_min } = await req.json();
  if (!logId) return NextResponse.json({ error: "logId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const update: Record<string, unknown> = {};
  if (typeof note_etoiles === "number") update.note_etoiles = note_etoiles;
  if (typeof note_texte === "string") update.note_texte = note_texte || null;
  if (typeof duration_min === "number") update.duration_min = duration_min;

  const { error } = await admin
    .from("seances_log")
    .update(update)
    .eq("id", logId)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
