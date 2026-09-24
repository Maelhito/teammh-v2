import type { SupabaseClient, User } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans } from "./temps";

/**
 * Chaque membre de l'équipe a sa cliente test : un vrai compte cliente, rattaché
 * à lui, sur lequel il bascule depuis son téléphone pour vivre l'app côté cliente.
 * Le lien est porté par `user_metadata.test_de` (id du compte coach).
 * L'adresse est en example.com : aucun email ne peut jamais y partir.
 */

function meta(user: User): Record<string, unknown> {
  return (user.user_metadata ?? {}) as Record<string, unknown>;
}

export function proprietaireDuTest(user: User | null | undefined): string | null {
  const id = user ? meta(user).test_de : null;
  return typeof id === "string" ? id : null;
}

export async function trouverOuCreerClienteTest(admin: SupabaseClient, coach: User): Promise<User> {
  const { data: liste, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existant = liste.users.find((u) => proprietaireDuTest(u) === coach.id);
  if (existant) return existant;

  const m = meta(coach);
  const prenom = String(m.prenom ?? "").trim() || (coach.email?.split("@")[0] ?? "Coach");
  const nomFamille = String(m.nom ?? "").trim();
  const nom = `${nomFamille} (test)`.trim();

  // Les fiches équipe du coach : sa casquette coach et/ou nutrition.
  const ids = Array.isArray(m.team_member_ids) ? (m.team_member_ids as string[]) : [];
  const { data: fiches } = ids.length
    ? await admin.from("team_members").select("id, role").in("id", ids)
    : { data: [] as { id: string; role: string | null }[] };
  const coachId = fiches?.find((f) => (f.role ?? "coach") === "coach")?.id ?? null;
  const nutritionId = fiches?.find((f) => f.role === "nutrition")?.id ?? null;

  const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
    email: `test-${coach.id.slice(0, 8)}@example.com`,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { prenom, nom, role: "cliente", test_de: coach.id },
  });
  if (erreurCreation || !cree.user) throw erreurCreation ?? new Error("Création impossible");

  const { error: erreurProfil } = await admin.from("user_profiles").upsert({
    user_id: cree.user.id,
    prenom,
    nom,
    statut: "active",
    acces_app: true,
    date_demarrage: aujourdhuiDans(FUSEAU_PAR_DEFAUT),
    timezone: FUSEAU_PAR_DEFAUT,
    timezone_auto: true,
    role: "cliente",
    coach_id: coachId,
    nutrition_id: nutritionId,
  }, { onConflict: "user_id" });
  if (erreurProfil) throw erreurProfil;

  return cree.user;
}

/** Ouvre une session sur `email` dans le navigateur courant, sans mot de passe ni email envoyé. */
export async function ouvrirSessionSur(
  admin: SupabaseClient,
  session: SupabaseClient,
  email: string,
): Promise<void> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const { error: erreurOtp } = await session.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "email",
  });
  if (erreurOtp) throw erreurOtp;
}
