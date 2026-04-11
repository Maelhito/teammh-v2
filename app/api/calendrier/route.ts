import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { titre, date, heure, recurrence, message, rappel } = body;

  if (!titre || !date) {
    return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });
  }

  const validRecurrences = ["none", "weekly", "monthly"];
  if (recurrence && !validRecurrences.includes(recurrence)) {
    return NextResponse.json({ error: "Récurrence invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id: session.user.id,
      target_user_id: session.user.id,
      titre: String(titre).slice(0, 200),
      date,
      heure: heure || null,
      recurrence: recurrence ?? "none",
      message: message ? String(message).slice(0, 1000) : null,
      rappel: rappel === true,
      created_by: "cliente",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/calendrier] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("created_by", "cliente");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, date, heure } = body;

  if (!id || !date) return NextResponse.json({ error: "id et date requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .update({ date, heure: heure || null })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("created_by", "cliente")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
