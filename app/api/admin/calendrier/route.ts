import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { titre, date, recurrence, message, lien, target_user_id } = body;

  if (!titre || !date) {
    return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });
  }

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  if (recurrence && !validRecurrences.includes(recurrence)) {
    return NextResponse.json({ error: "Récurrence invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id: session.user.id,
      target_user_id: target_user_id || null,
      titre: String(titre).slice(0, 200),
      date,
      recurrence: recurrence ?? "none",
      message: message ? String(message).slice(0, 1000) : null,
      lien: lien ? String(lien).slice(0, 500) : null,
      created_by: "admin",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/admin/calendrier] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
