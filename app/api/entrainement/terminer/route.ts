import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { assignmentId } = await req.json();
  if (!assignmentId) return NextResponse.json({ error: "assignmentId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, seances_effectuees")
    .eq("id", assignmentId)
    .eq("user_id", session.user.id)
    .single();

  if (!assignment) return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });

  await admin
    .from("client_programmes")
    .update({ seances_effectuees: (assignment.seances_effectuees ?? 0) + 1 })
    .eq("id", assignmentId);

  return NextResponse.json({ success: true });
}
