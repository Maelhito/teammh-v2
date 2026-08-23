import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { estRendezVous } from "@/lib/couleurs-calendrier";
import { estFuseauValide, instantDepuis } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";



async function requireAdmin(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!isAdminUser(session?.user)) return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("id, titre, date, heure, recurrence, rappel, target_user_id, event_type, lien, message, created_by")
    .neq("event_type", "seance")
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { titre, date, heure, recurrence, message, lien, target_user_id, rappel, rappel_minutes, event_type } = body;

  if (!titre || !date) {
    return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });
  }

  const validRecurrences = ["none", "daily", "weekly", "monthly"];
  if (recurrence && !validRecurrences.includes(recurrence)) {
    return NextResponse.json({ error: "Récurrence invalide" }, { status: 400 });
  }

  const validEventTypes = ["coach", "nutrition", "coaching_groupe"];
  const resolvedEventType = validEventTypes.includes(event_type) ? event_type : "coach";
  const rappelMinutes = typeof rappel_minutes === "number" ? rappel_minutes : 0;

  // Un rendez-vous sans heure ne dit rien à la cliente : son calendrier et son
  // accueil n'affichaient qu'un titre. L'heure est donc exigée ici, pas
  // seulement suggérée par le formulaire.
  if (estRendezVous(resolvedEventType) && !heure) {
    return NextResponse.json({ error: "Heure requise pour un rendez-vous" }, { status: 400 });
  }

  // Fuseau de saisie : celui de l'admin par défaut. Pour une visio de groupe
  // diffusée à toutes (target_user_id null), c'est le seul repère possible —
  // et c'est justement le cas où chaque cliente doit voir SON heure à elle.
  const fuseauSaisie = estFuseauValide(body.timezone) ? body.timezone : await getFuseau(session.user.id);
  const instant = heure ? instantDepuis(date, heure, fuseauSaisie) : null;
  if (heure && !instant) {
    return NextResponse.json({ error: "Date ou heure invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      user_id: session.user.id,
      target_user_id: target_user_id || null,
      titre: String(titre).slice(0, 200),
      date,
      heure: heure || null,
      starts_at: instant ? instant.toISOString() : null,
      timezone: instant ? fuseauSaisie : null,
      recurrence: recurrence ?? "none",
      message: message ? String(message).slice(0, 1000) : null,
      lien: lien ? String(lien).slice(0, 500) : null,
      rappel: rappel === true,
      rappel_minutes: rappelMinutes,
      created_by: "admin",
      event_type: resolvedEventType,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/admin/calendrier] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("created_by", "admin"); // sécurité : l'admin ne peut supprimer que ses propres événements

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
