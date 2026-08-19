import { NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/is-admin";

export async function GET() {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();

  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allClientes = users.filter(u =>
    u.email !== "mael.ld@hotmail.fr" &&
    (u.user_metadata?.role ?? "cliente") === "cliente"
  );

  const ids = allClientes.map(u => u.id);
  if (!ids.length) return NextResponse.json({ clientes: [] });

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, prenom, nom, statut, date_demarrage, coach_id, nutrition_id")
    .in("user_id", ids);

  // Filtrer uniquement les clientes assignées à ce coach.
  // `coach_id` / `nutrition_id` désignent des `team_members`, pas des comptes
  // auth : la comparaison se fait donc sur user_metadata.team_member_ids, comme
  // dans la liste du portail coach. (Comparer à user.id ne matchait jamais.)
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const teamMemberIds: string[] = (meta?.team_member_ids as string[] | undefined) ?? [];
  const clientes = isAdminUser(user)
    ? allClientes
    : allClientes.filter(u => {
        const p = (profiles ?? []).find(x => x.user_id === u.id);
        if (!p) return false;
        return (
          (p.coach_id !== null && teamMemberIds.includes(p.coach_id)) ||
          (p.nutrition_id !== null && teamMemberIds.includes(p.nutrition_id))
        );
      });

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));

  const result = clientes.map(u => ({
    id: u.id,
    email: u.email ?? "",
    prenom: profileMap[u.id]?.prenom ?? null,
    nom: profileMap[u.id]?.nom ?? null,
    statut: profileMap[u.id]?.statut ?? "active",
    date_demarrage: profileMap[u.id]?.date_demarrage ?? null,
  }));

  return NextResponse.json({ clientes: result });
}
