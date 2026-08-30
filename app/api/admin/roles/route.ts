import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { rattacherUnCompte } from "@/lib/equipe-comptes";



export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    prenom: u.user_metadata?.prenom ?? "",
    nom: u.user_metadata?.nom ?? "",
    role: (u.user_metadata?.role ?? "cliente") as string,
  }));

  return NextResponse.json({ users: result });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { userId, role } = await req.json();
  if (!userId || !["cliente", "coach", "admin", "nutrition"].includes(role)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // 1. Mise à jour dans user_metadata (toujours disponible)
  const { data: maj, error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Passer quelqu'un en coach / nutrition, c'est le faire entrer dans l'équipe :
  // sa fiche `team_members` suit, sinon il reste invisible à l'attribution.
  if (maj?.user && (role === "coach" || role === "nutrition")) {
    await rattacherUnCompte(admin, maj.user);
  }

  // 2. Tentative de sync dans user_profiles.role (si la colonne existe)
  try {
    await admin.from("user_profiles").upsert(
      { user_id: userId, role, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  } catch {
    // La colonne n'existe pas encore — ignoré, user_metadata suffit
  }

  return NextResponse.json({ success: true });
}
