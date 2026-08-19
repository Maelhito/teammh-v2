import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;
  if (!(await coachPeutVoirCliente(user, clientId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

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
  if (!(await coachPeutVoirCliente(user, clientId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  // ── Assignation d'un programme ────────────────────────────────────────────
  if (body.action === "programme") {
    const { programme_id, date_debut } = body;
    if (!programme_id || !date_debut) {
      return NextResponse.json({ error: "programme_id et date_debut requis" }, { status: 400 });
    }

    const { data: programme, error: progError } = await admin
      .from("programmes")
      .select("description, nom")
      .eq("id", programme_id)
      .single();

    if (progError || !programme) {
      return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
    }

    type CellItem = { type: string; seanceName?: string; nom?: string; duree?: number | null };
    let grid: Record<string, CellItem[]> = {};
    try {
      const desc = (programme.description as string) || "";
      if (desc.startsWith("{")) {
        const parsed = JSON.parse(desc);
        grid = parsed.grid ?? {};
      }
    } catch {}

    const startDate = new Date(date_debut + "T00:00:00");
    const rows: object[] = [];

    for (const [key, items] of Object.entries(grid)) {
      const match = key.match(/^S(\d+)_J(\d+)$/);
      if (!match) continue;
      const semaine = parseInt(match[1]);
      const jour    = parseInt(match[2]);

      for (const item of items) {
        if (item.type !== "seance" && item.type !== "seance_locale") continue;
        const nom = item.seanceName ?? item.nom ?? "Séance";

        const d = new Date(startDate);
        d.setDate(d.getDate() + (semaine - 1) * 7 + (jour - 1));
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        rows.push({
          user_id:        user.id,
          target_user_id: clientId,
          titre:          nom,
          date:           dateStr,
          heure:          null,
          recurrence:     "none",
          message:        null,
          lien:           null,
          rappel:         false,
          rappel_minutes: 0,
          created_by:     "admin",
          event_type:     "seance",
        });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucune séance dans ce programme" }, { status: 400 });
    }

    const { data: created, error: insertError } = await admin
      .from("calendar_events")
      .insert(rows)
      .select();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ events: created ?? [] });
  }

  // ── Événement ou tâche unique ─────────────────────────────────────────────
  const { titre, date, heure, recurrence, message, lien, rappel, rappel_minutes, event_type } = body;
  if (!titre || !date) return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  const validEventTypes  = ["coach", "nutrition", "coaching_groupe", "tache", "seance"];

  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id:        user.id,
      target_user_id: clientId,
      titre:          String(titre).slice(0, 200),
      date,
      heure:          heure || null,
      recurrence:     validRecurrences.includes(recurrence) ? recurrence : "none",
      message:        message ? String(message).slice(0, 1000) : null,
      lien:           lien ? String(lien).slice(0, 500) : null,
      rappel:         rappel === true,
      rappel_minutes: typeof rappel_minutes === "number" ? rappel_minutes : 0,
      created_by:     "admin",
      event_type:     validEventTypes.includes(event_type) ? event_type : "coach",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;
  if (!(await coachPeutVoirCliente(user, clientId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id requis" }, { status: 400 });

  const body = await req.json();
  const { titre, date, heure, message, lien } = body;
  if (!titre || !date) return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .update({
      titre:   String(titre).slice(0, 200),
      date,
      heure:   heure || null,
      message: message ? String(message).slice(0, 1000) : null,
      lien:    lien ? String(lien).slice(0, 500) : null,
    })
    .eq("id", eventId)
    .eq("target_user_id", clientId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;
  if (!(await coachPeutVoirCliente(user, clientId))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

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
