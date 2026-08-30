import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Le lien manquant entre un COMPTE (auth) et une FICHE ÉQUIPE (`team_members`).
 *
 * S'inscrire via le lien coach (`/inscription?role=coach`) ne créait qu'un
 * compte : aucune ligne dans `team_members`. Or l'admin attribue les clientes
 * en choisissant un `team_members` (`user_profiles.coach_id`), pas un compte.
 * Une coach fraîchement inscrite n'apparaissait donc nulle part dans la liste
 * d'attribution.
 *
 * Le retour est tout aussi nécessaire : le portail coach filtre les clientes
 * sur `user_metadata.team_member_ids` (voir `app/api/coach/clientes/route.ts`).
 * Sans ce tableau, même une coach attribuée à la main ouvrait un espace vide.
 *
 * Ces deux fonctions font les deux moitiés : fiche équipe créée (ou retrouvée),
 * puis son id inscrit dans `team_member_ids` du compte.
 */

const ROLES_EQUIPE = new Set(["coach", "nutrition"]);

export interface MembreEquipe {
  id: string;
  nom: string;
  role: string | null;
}

function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function roleDuCompte(user: User): string {
  const role = (user.user_metadata as Record<string, unknown> | undefined)?.role;
  return typeof role === "string" ? role : "cliente";
}

function idsEquipeDuCompte(user: User): string[] {
  const ids = (user.user_metadata as Record<string, unknown> | undefined)?.team_member_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

/**
 * Rattache un compte à sa fiche équipe. `membres` est la liste déjà chargée —
 * elle est complétée sur place quand une fiche est créée, pour que la
 * synchronisation d'un lot n'insère pas deux fois la même personne.
 *
 * Renvoie l'id du `team_members` rattaché, ou null si rien n'était à faire
 * (compte qui n'est pas de l'équipe, lien déjà en place, homonymie).
 */
export async function rattacherCompteAEquipe(
  admin: SupabaseClient,
  user: User,
  membres: MembreEquipe[],
): Promise<string | null> {
  const role = roleDuCompte(user);
  if (!ROLES_EQUIPE.has(role)) return null;

  // Un compte déjà relié à une fiche est laissé tel quel — y compris quand la
  // fiche pointée n'existe plus : l'admin l'avait supprimée, on ne la recrée pas
  // dans son dos. Seuls les comptes jamais rattachés sont traités ici.
  const idsExistants = idsEquipeDuCompte(user);
  if (idsExistants.length > 0) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const prenom = String(meta.prenom ?? "").trim();
  const nomFamille = String(meta.nom ?? "").trim();
  const nomComplet = `${prenom} ${nomFamille}`.trim() || (user.email?.split("@")[0] ?? "");
  if (!nomComplet) return null;
  // Les fiches existantes portent le prénom seul (« Yoan », « Julie ») : la
  // nouvelle suit la même convention, c'est ce que l'admin lit dans le menu.
  const nomFiche = prenom || nomComplet;

  // Une fiche a pu être créée à la main dans « Mon équipe » avant l'inscription :
  // on la retrouve par le nom plutôt que d'en créer une seconde.
  const cibleComplete = normaliser(nomComplet);
  const ciblePrenom = normaliser(prenom);
  const candidats = membres.filter((m) => {
    if ((m.role ?? "coach") !== role) return false;
    const nom = normaliser(m.nom);
    if (nom === cibleComplete) return true;
    return Boolean(ciblePrenom) && (nom === ciblePrenom || nom.startsWith(`${ciblePrenom} `));
  });

  // Deux fiches portent le même nom : on ne devine pas, l'admin tranchera.
  if (candidats.length > 1) return null;

  let membre = candidats[0];
  if (!membre) {
    const { data, error } = await admin
      .from("team_members")
      .insert({
        nom: nomFiche.slice(0, 100),
        titre: role === "nutrition" ? "Nutrition" : "Coach",
        role,
      })
      .select("id, nom, role")
      .single();
    if (error || !data) return null;
    membre = data as MembreEquipe;
    membres.push(membre);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, team_member_ids: [membre.id] },
  });
  if (error) return null;

  return membre.id;
}

/** Même chose pour un compte isolé, quand la liste des membres n'est pas déjà chargée. */
export async function rattacherUnCompte(admin: SupabaseClient, user: User): Promise<string | null> {
  if (!ROLES_EQUIPE.has(roleDuCompte(user))) return null;
  const { data } = await admin.from("team_members").select("id, nom, role");
  return rattacherCompteAEquipe(admin, user, (data ?? []) as MembreEquipe[]);
}

/**
 * Rattrapage pour tous les comptes équipe existants. Idempotent : une fois les
 * liens en place, les appels suivants ne touchent plus rien.
 */
export async function synchroniserComptesEquipe(admin: SupabaseClient): Promise<number> {
  const [{ data: auth, error: erreurAuth }, { data: membres }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 500 }),
    admin.from("team_members").select("id, nom, role"),
  ]);
  if (erreurAuth) return 0;

  const liste = (membres ?? []) as MembreEquipe[];
  let rattaches = 0;
  for (const user of auth?.users ?? []) {
    if (!ROLES_EQUIPE.has(roleDuCompte(user))) continue;
    if (await rattacherCompteAEquipe(admin, user, liste)) rattaches += 1;
  }
  return rattaches;
}
