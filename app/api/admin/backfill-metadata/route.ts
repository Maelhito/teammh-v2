import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/is-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Migration ponctuelle : copie role/statut de user_profiles vers user_metadata
// pour que le middleware n'ait plus besoin d'interroger la DB à chaque navigation.
// À supprimer une fois exécutée une fois en prod.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select("user_id, role, statut");
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  let updated = 0;
  const errors: string[] = [];

  for (const profile of profiles ?? []) {
    const metadata: Record<string, string> = {};
    if (profile.role) metadata.role = profile.role;
    if (profile.statut) metadata.statut = profile.statut;
    if (Object.keys(metadata).length === 0) continue;

    const { error } = await admin.auth.admin.updateUserById(profile.user_id, {
      user_metadata: metadata,
    });
    if (error) errors.push(`${profile.user_id}: ${error.message}`);
    else updated += 1;
  }

  return NextResponse.json({ success: true, updated, errors });
}
