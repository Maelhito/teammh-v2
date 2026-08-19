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

  // Récupère coach_id et nutrition_id de la cliente
  const { data: profile } = await admin
    .from("user_profiles")
    .select("coach_id, nutrition_id")
    .eq("user_id", clientId)
    .single();

  if (!profile) return NextResponse.json({ coach: null, nutrition: null });

  // Récupère les infos des membres d'équipe assignés
  const ids = [profile.coach_id, profile.nutrition_id].filter(Boolean) as string[];
  const { data: members } = ids.length
    ? await admin.from("team_members").select("id, nom, titre, lien_zoom, role").in("id", ids)
    : { data: [] };

  const byId = Object.fromEntries((members ?? []).map(m => [m.id, m]));

  return NextResponse.json({
    coach:     profile.coach_id     ? byId[profile.coach_id]     ?? null : null,
    nutrition: profile.nutrition_id ? byId[profile.nutrition_id] ?? null : null,
  });
}
