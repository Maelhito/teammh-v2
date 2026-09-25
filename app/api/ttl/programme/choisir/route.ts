import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { computeCurrentPeriode, getOffreCliente } from "@/lib/ttl";

/**
 * La cliente choisit le programme de sa période en cours (4 semaines). Le choix ne vaut
 * que pour cette période : à la suivante, elle reprend les programmes dans l'ordre.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { programmeId } = await request.json();
  if (!programmeId || typeof programmeId !== "string") {
    return NextResponse.json({ error: "programmeId requis" }, { status: 400 });
  }

  const offre = await getOffreCliente(user.id);
  if (offre?.offre !== "TTL") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const periode = offre.date_debut ? computeCurrentPeriode(offre.date_debut) : 1;

  const admin = createSupabaseAdminClient();
  const { data: programme } = await admin.from("ttl_programmes").select("id").eq("id", programmeId).maybeSingle();
  if (!programme) return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });

  const { error } = await admin
    .from("ttl_programme_choix")
    .upsert({ user_id: user.id, periode, programme_id: programmeId }, { onConflict: "user_id,periode" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
