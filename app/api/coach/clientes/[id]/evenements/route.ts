import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

async function checkAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? "cliente";
  if (role !== "coach" && role !== "admin" && user.email !== ADMIN_EMAIL) return null;
  return user;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkAccess();
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
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id: clientId } = await params;

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  // Programme assignment: lit la grille JSON du programme et crée un event par séance
  if (body.action === "programme") {
    const { programme_id, date_debut } = body;
    if (!programme_id || !date_debut) {
      return NextResponse.json({ error: "programme_id et date_debut requis" }, { status: 400 });
    }

    // Récupère le programme depuis la table programmes
    const { data: programme, error: progError } = await admin
      .from("programmes")
      .select("description, nom")
      .eq("id", programme_id)
      .single();

    if (progError || !programme) {
      return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
    }

    // Parse la grille depuis le JSON stocké dans description
    type CellItem = { type: string; seanceName?: string; nom?: string; duree?: number | null };
    let grid: Record<string, CellItem[]> = {};
    try {
      const desc = (programme.description as string) || "";
      if (desc.startsWith("{")) {
        const parsed = JSON.parse(desc);
        grid = parsed.grid ?? {};
      }
    } catch {}

    // Construit un event calendrier pour chaque séance de la grille
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
          user_id:           user.id,
          target_user_id:    clientId,
          titre:             nom,
          date:              dateStr,
          heure:             null,
          recurrence:        "none",
          message:           null,
          lien:              null,
          rappel:            false,
          rappel_minutes:    0,
          created_by:        "admin",
          event_type:        "coach",
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

  // Single event (evenement or tache)
  const { titre, date, heure, recurrence, message, lien, rappel, rappel_minutes, event_type } = body;
  if (!titre || !date) return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  const validEventTypes = ["coach", "nutrition", "coaching_groupe"];

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
  const user = await checkAccess();
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
