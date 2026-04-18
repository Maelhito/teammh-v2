import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// GET : liste des membres de l'équipe + coach_id / nutrition_id de l'utilisateur courant
export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const [{ data: members, error: membersError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("team_members").select("id, nom, titre, lien_zoom").order("created_at", { ascending: true }),
    admin.from("user_profiles").select("coach_id, nutrition_id").eq("user_id", session.user.id).single(),
  ]);

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });
  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116 = no rows, ignoré
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    members: members ?? [],
    coach_id: profile?.coach_id ?? null,
    nutrition_id: profile?.nutrition_id ?? null,
  });
}
