// Route temporaire de seed - À SUPPRIMER après les tests
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { aujourdhuiDans, fuseauAppareil } from "@/lib/temps";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const progId = req.nextUrl.searchParams.get("prog") ?? "fde51890-7ffc-4746-b328-e1d0a26ad2b1";
  const weeksAgo = parseInt(req.nextUrl.searchParams.get("weeks") ?? "0");

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Récupérer le programme template
  const { data: prog, error: progErr } = await admin
    .from("programmes")
    .select("*")
    .eq("id", progId)
    .single();

  if (progErr || !prog) {
    return NextResponse.json({ error: "Programme introuvable", detail: progErr?.message }, { status: 404 });
  }

  // Date de début = aujourd'hui - weeksAgo semaines. Outil dev uniquement
  // (gated par NODE_ENV plus haut) : le fuseau de l'appareil du dev suffit.
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - weeksAgo * 7);
  const dateDebutStr = aujourdhuiDans(fuseauAppareil(), dateDebut);

  // Mettre les précédents en pause
  await admin
    .from("client_programmes")
    .update({ statut: "pause" })
    .eq("user_id", session.user.id)
    .eq("statut", "en_cours");

  // Insérer le nouveau
  const { data: assignment, error: insertErr } = await admin
    .from("client_programmes")
    .insert({
      user_id: session.user.id,
      programme_id: progId,
      date_debut: dateDebutStr,
      statut: "en_cours",
      grid_data: prog.description ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Programme "${prog.nom}" assigné à ton compte`,
    date_debut: dateDebutStr,
    user_id: session.user.id,
    assignment_id: assignment.id,
  });
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  await admin.from("client_programmes").delete().eq("user_id", session.user.id);

  return NextResponse.json({ ok: true, message: "Tous les programmes supprimés pour ce compte" });
}
