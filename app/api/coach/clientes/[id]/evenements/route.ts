import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { estRendezVous } from "@/lib/couleurs-calendrier";
import { estFuseauValide, instantDepuis } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";
import { MAX_TACHES_EN_COURS, limiteDeVieTache } from "@/lib/taches";

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

  // Il y avait ici une branche `action: "programme"` qui recopiait la grille
  // d'un programme en lignes `calendar_events` de type "seance". Plus personne
  // ne l'appelait, et ses lignes n'étaient affichées nulle part : depuis que le
  // calendrier et l'accueil lisent les séances directement dans la grille, ils
  // écartent explicitement les `event_type = "seance"`. Elle datait en plus ses
  // séances avec « début + (jour - 1) », la convention erronée qu'on vient de
  // corriger dans le calendrier — un piège en attente pour la prochaine fois.

  // ── Événement ou tâche unique ─────────────────────────────────────────────
  const { titre, date, heure, recurrence, message, lien, rappel, rappel_minutes, event_type } = body;
  if (!titre || !date) return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  const validEventTypes  = ["coach", "nutrition", "coaching_groupe", "tache", "seance"];
  const resolvedEventType = validEventTypes.includes(event_type) ? event_type : "coach";

  // Un rendez-vous sans heure ne dit rien à la cliente : son calendrier et son
  // accueil n'affichaient qu'un titre. L'heure est donc exigée ici, pas
  // seulement suggérée par le formulaire. Tâches et séances n'en ont pas.
  if (estRendezVous(resolvedEventType) && !heure) {
    return NextResponse.json({ error: "Heure requise pour un rendez-vous" }, { status: 400 });
  }

  // Pas plus de 5 tâches en vie en même temps (moins de 7 jours, validées ou non).
  if (resolvedEventType === "tache") {
    const { count, error: countError } = await admin
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("target_user_id", clientId)
      .eq("event_type", "tache")
      .gte("created_at", limiteDeVieTache());
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if ((count ?? 0) >= MAX_TACHES_EN_COURS) {
      return NextResponse.json({
        error: `Cette cliente a déjà ${MAX_TACHES_EN_COURS} tâches en cours. Une place se libère 7 jours après la création de la plus ancienne (ou supprime-en une).`,
      }, { status: 400 });
    }
  }

  // Dans quel fuseau le coach vient-il de taper cette heure ? Le sien par
  // défaut ; le formulaire peut passer celui de la cliente s'il a choisi de
  // raisonner à son heure à elle. Sans cette information, « 9:00 » ne désigne
  // aucun moment précis — c'est toute l'origine du rendez-vous manqué.
  const fuseauSaisie = estFuseauValide(body.timezone) ? body.timezone : await getFuseau(user.id);
  const instant = heure ? instantDepuis(date, heure, fuseauSaisie) : null;
  if (heure && !instant) {
    return NextResponse.json({ error: "Date ou heure invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id:        user.id,
      target_user_id: clientId,
      titre:          String(titre).slice(0, 200),
      date,
      heure:          heure || null,
      starts_at:      instant ? instant.toISOString() : null,
      timezone:       instant ? fuseauSaisie : null,
      recurrence:     validRecurrences.includes(recurrence) ? recurrence : "none",
      message:        message ? String(message).slice(0, 1000) : null,
      lien:           lien ? String(lien).slice(0, 500) : null,
      rappel:         rappel === true,
      rappel_minutes: typeof rappel_minutes === "number" ? rappel_minutes : 0,
      created_by:     "admin",
      event_type:     resolvedEventType,
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

  // Modifier un rendez-vous ne doit pas pouvoir lui retirer son heure.
  const { data: existant } = await admin
    .from("calendar_events")
    .select("event_type")
    .eq("id", eventId)
    .eq("target_user_id", clientId)
    .single();
  if (estRendezVous(existant?.event_type) && !heure) {
    return NextResponse.json({ error: "Heure requise pour un rendez-vous" }, { status: 400 });
  }
  const fuseauSaisie = estFuseauValide(body.timezone) ? body.timezone : await getFuseau(user.id);
  const instant = heure ? instantDepuis(date, heure, fuseauSaisie) : null;
  if (heure && !instant) {
    return NextResponse.json({ error: "Date ou heure invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("calendar_events")
    .update({
      titre:   String(titre).slice(0, 200),
      date,
      heure:   heure || null,
      starts_at: instant ? instant.toISOString() : null,
      timezone:  instant ? fuseauSaisie : null,
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
