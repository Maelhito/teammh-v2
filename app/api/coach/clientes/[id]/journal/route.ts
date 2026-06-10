import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id: clienteId } = await params;

  const admin = createSupabaseAdminClient();

  // Vérifier que la cliente existe
  const { data: { user: cliente } } = await admin.auth.admin.getUserById(clienteId);
  if (!cliente) return NextResponse.json({ error: "Cliente introuvable" }, { status: 404 });

  const { data: logs, error } = await admin
    .from("seances_log")
    .select("id, seance_nom, completed_at, duration_min, note_etoiles, note_texte, grid_key")
    .eq("user_id", clienteId)
    .order("completed_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: logs ?? [] });
}
