import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .or(`target_user_id.eq.${clientId},and(user_id.eq.${clientId},created_by.eq.cliente)`)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;

  const body = await req.json();
  const { titre, date, heure, recurrence, message, lien, rappel, rappel_minutes, event_type } = body;

  if (!titre || !date) return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  const validEventTypes = ["coach", "nutrition", "coaching_groupe"];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id: user.id,
      target_user_id: clientId,
      titre: String(titre).slice(0, 200),
      date,
      heure: heure || null,
      recurrence: validRecurrences.includes(recurrence) ? recurrence : "none",
      message: message ? String(message).slice(0, 1000) : null,
      lien: lien ? String(lien).slice(0, 500) : null,
      rappel: rappel === true,
      rappel_minutes: typeof rappel_minutes === "number" ? rappel_minutes : 0,
      created_by: "admin",
      event_type: validEventTypes.includes(event_type) ? event_type : "coach",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;

  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("target_user_id", clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
