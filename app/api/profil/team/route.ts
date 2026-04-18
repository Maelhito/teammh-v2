import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// POST : enregistre le choix de coach_id ou nutrition_id pour la cliente
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { coach_id, nutrition_id } = body;

  // Vérifie que les UUIDs sont valides si fournis
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (coach_id !== undefined && coach_id !== null && !uuidRe.test(coach_id)) {
    return NextResponse.json({ error: "coach_id invalide" }, { status: 400 });
  }
  if (nutrition_id !== undefined && nutrition_id !== null && !uuidRe.test(nutrition_id)) {
    return NextResponse.json({ error: "nutrition_id invalide" }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (coach_id !== undefined) update.coach_id = coach_id;
  if (nutrition_id !== undefined) update.nutrition_id = nutrition_id;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .upsert({ user_id: session.user.id, ...update }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
