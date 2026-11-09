/**
 * Connecteur Claude (MCP) — qui appelle, et quelles clientes il a le droit de voir.
 *
 * Même règle que le portail coach :
 *  - un admin voit toutes les clientes ;
 *  - un coach voit celles dont il est le coach ou la nutritionniste
 *    (`coach_id` / `nutrition_id` ∈ `user_metadata.team_member_ids`) ;
 *  - une cliente n'a pas accès au connecteur.
 * Le rôle est relu à chaque appel : retirer le rôle coach coupe l'accès tout de
 * suite, même si Claude a encore un jeton valide.
 */
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/is-admin";
import { proprietaireDuTest } from "@/lib/cliente-test";
import { verifier } from "./jeton";

export function estCoachOuAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return (user.user_metadata?.role ?? "cliente") === "coach";
}

/** Lit le jeton « Bearer » et renvoie le compte coach/admin correspondant. */
export async function utilisateurDuJeton(req: Request): Promise<User | null> {
  const entete = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(entete);
  const jeton = verifier(m?.[1]?.trim(), "acces");
  if (!jeton) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(jeton.u);
  if (error || !data?.user) return null;
  return estCoachOuAdmin(data.user) ? data.user : null;
}

export interface ClienteVisible {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  statut: string;
  date_demarrage: string | null;
  inscrite_le: string | null;
  coach_id: string | null;
  nutrition_id: string | null;
  timezone: string | null;
  objectif_4mois_poids: string | number | null;
  objectif_4mois_bienetre: string | null;
  objectif_12mois_poids: string | number | null;
  objectif_12mois_bienetre: string | null;
}

/** Toutes les clientes que ce compte a le droit de voir (comptes test exclus). */
export async function clientesVisibles(user: User): Promise<ClienteVisible[]> {
  const admin = createSupabaseAdminClient();

  const comptes: User[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    comptes.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const clientes = comptes.filter(
    (u) =>
      !isAdminUser(u) &&
      (u.user_metadata?.role ?? "cliente") === "cliente" &&
      !proprietaireDuTest(u),
  );
  if (!clientes.length) return [];

  const profils = new Map<string, Record<string, unknown>>();
  const ids = clientes.map((u) => u.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("user_profiles")
      .select(
        "user_id, prenom, nom, statut, date_demarrage, coach_id, nutrition_id, role, timezone, objectif_4mois_poids, objectif_4mois_bienetre, objectif_12mois_poids, objectif_12mois_bienetre",
      )
      .in("user_id", ids.slice(i, i + 200));
    for (const p of data ?? []) profils.set(p.user_id as string, p);
  }

  const voitTout = isAdminUser(user);
  const equipe = (user.user_metadata?.team_member_ids as string[] | undefined) ?? [];

  const resultat: ClienteVisible[] = [];
  for (const u of clientes) {
    const p = profils.get(u.id) ?? {};
    // Un profil marqué coach/admin n'est pas une cliente, même si le compte dit l'inverse.
    if (p.role === "coach" || p.role === "admin") continue;
    const coachId = (p.coach_id as string | null) ?? null;
    const nutritionId = (p.nutrition_id as string | null) ?? null;
    if (!voitTout) {
      const sienne =
        (coachId !== null && equipe.includes(coachId)) ||
        (nutritionId !== null && equipe.includes(nutritionId));
      if (!sienne) continue;
    }
    resultat.push({
      id: u.id,
      email: u.email ?? "",
      prenom: (p.prenom as string | null) ?? (u.user_metadata?.prenom as string | undefined) ?? null,
      nom: (p.nom as string | null) ?? (u.user_metadata?.nom as string | undefined) ?? null,
      statut: (p.statut as string | null) ?? "active",
      date_demarrage: (p.date_demarrage as string | null) ?? null,
      inscrite_le: u.created_at ? u.created_at.slice(0, 10) : null,
      coach_id: coachId,
      nutrition_id: nutritionId,
      timezone: (p.timezone as string | null) ?? null,
      objectif_4mois_poids: (p.objectif_4mois_poids as string | number | null) ?? null,
      objectif_4mois_bienetre: (p.objectif_4mois_bienetre as string | null) ?? null,
      objectif_12mois_poids: (p.objectif_12mois_poids as string | number | null) ?? null,
      objectif_12mois_bienetre: (p.objectif_12mois_bienetre as string | null) ?? null,
    });
  }
  return resultat;
}
