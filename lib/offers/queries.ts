import type { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { OFFRE_ORDER, type Offre, type Phase } from "./types";
import { aujourdhuiDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export function estHorsOrdre(avant: Offre | null, apres: Offre): boolean {
  if (!avant) return false; // première affectation : jamais hors ordre
  return OFFRE_ORDER.indexOf(apres) !== OFFRE_ORDER.indexOf(avant) + 1;
}

export async function getOffresMap(
  admin: AdminClient,
  userIds: string[]
): Promise<Record<string, { offre: Offre; date_debut: string | null; phase: Phase }>> {
  const ids = userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"];

  // Tentative avec la colonne phase (migration offres_clientes_phase.sql appliquée)
  const withPhase = await admin
    .from("offres_clientes")
    .select("user_id, offre, date_debut, phase")
    .in("user_id", ids);

  // Repli si la colonne phase n'existe pas encore (migration non appliquée) →
  // on ne casse rien, tout le monde est traité comme 'demarree' (accès complet)
  const rows = withPhase.error
    ? (await admin
        .from("offres_clientes")
        .select("user_id, offre, date_debut")
        .in("user_id", ids)).data
    : withPhase.data;

  return Object.fromEntries(
    (rows ?? []).map((o) => [
      o.user_id,
      {
        offre: o.offre as Offre,
        date_debut: o.date_debut,
        phase: ((o as { phase?: string }).phase as Phase) ?? "demarree",
      },
    ])
  );
}

/**
 * À partir de ce moment, une cliente SANS ligne `offres_clientes` est considérée
 * « en démarrage » : son compte vient d'être créé, elle n'a donc accès qu'au
 * module de démarrage tant que l'admin n'a pas cliqué « Démarrer » (ce qu'il
 * fait après l'appel de démarrage). C'est ce qui permet d'ouvrir un accès à
 * quelqu'un qui n'a pas encore payé, pour lui montrer que le programme existe,
 * sans lui livrer tout le contenu.
 *
 * Pourquoi une date et pas la simple absence de ligne : au moment où cette
 * règle a été posée, 38 clientes utilisaient déjà l'app sans ligne
 * `offres_clientes`. Les traiter comme des nouvelles les aurait toutes
 * enfermées dans le module de démarrage du jour au lendemain. Leur compte est
 * antérieur : leur démarrage est derrière elles.
 */
export const DEBUT_DEMARRAGE_AUTO = Date.parse("2026-08-28T00:00:00Z");

/** Phase d'une cliente qui n'a pas (encore) de ligne `offres_clientes`. */
export function phaseSansOffre(compteCreeLe: string | null | undefined): Phase {
  if (!compteCreeLe) return "demarree";
  const cree = Date.parse(compteCreeLe);
  if (Number.isNaN(cree)) return "demarree";
  return cree >= DEBUT_DEMARRAGE_AUTO ? "demarrage" : "demarree";
}

/**
 * Phase de démarrage d'une seule cliente.
 *
 * Une ligne `offres_clientes` fait toujours foi — c'est elle que le bouton de
 * l'admin écrit. Sans ligne, c'est l'ancienneté du compte qui tranche
 * (voir `phaseSansOffre`) : la date de création est lue à ce moment-là
 * seulement, pour ne pas payer un appel de plus sur le cas courant.
 */
export async function getClientPhase(admin: AdminClient, userId: string): Promise<Phase> {
  const map = await getOffresMap(admin, [userId]);
  const ligne = map[userId];
  if (ligne) return ligne.phase;

  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return phaseSansOffre(data?.user?.created_at ?? null);
  } catch {
    // Compte illisible : on n'enferme personne sur un incident réseau.
    return "demarree";
  }
}

/**
 * Change la phase de démarrage d'une cliente. Crée la ligne offres_clientes si elle
 * n'existe pas encore (offre TTM par défaut), pour que le bouton admin fonctionne
 * même sur une cliente qui n'a pas encore d'offre affectée.
 */
export async function setPhase(
  admin: AdminClient,
  user_id: string,
  phase: Phase
): Promise<{ error?: string }> {
  const { data: existing } = await admin
    .from("offres_clientes")
    .select("user_id")
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin.from("offres_clientes").update({ phase }).eq("user_id", user_id);
    return error ? { error: error.message } : {};
  }
  const { error } = await admin.from("offres_clientes").insert({ user_id, offre: "TTM", phase });
  return error ? { error: error.message } : {};
}

type UpsertOffreResult =
  | { error: string; status: number }
  | { needsConfirmation: true; offreAvant: Offre | null }
  | { success: true };

export async function upsertOffre(
  admin: AdminClient,
  params: { user_id: string; offre: Offre; confirmed: boolean; actorEmail: string | null }
): Promise<UpsertOffreResult> {
  const { user_id, offre, confirmed, actorEmail } = params;

  const { data: existing } = await admin
    .from("offres_clientes")
    .select("offre, phase")
    .eq("user_id", user_id)
    .maybeSingle();

  const offreAvant = (existing?.offre as Offre | null) ?? null;
  if (offreAvant === offre) {
    return { error: "Cette cliente est déjà sur cette offre", status: 400 };
  }

  const horsOrdre = estHorsOrdre(offreAvant, offre);
  if (horsOrdre && !confirmed) {
    return { needsConfirmation: true, offreAvant };
  }

  // Le jour de départ compte dans le fuseau DE LA CLIENTE, pas celui du coach
  // qui affecte l'offre ni celui du serveur.
  const dateDebut = aujourdhuiDans(await getFuseau(user_id));

  // Affecter une offre ne doit RIEN changer à la phase. La ligne n'existant pas
  // encore, la base y mettrait son défaut 'demarrage' : une cliente ancienne,
  // qui travaille depuis des mois, se retrouverait enfermée dans le module de
  // démarrage le jour où on lui pose une offre. On inscrit donc explicitement
  // la phase qu'elle a déjà.
  const phase = existing
    ? ((existing as { phase?: string }).phase as Phase | undefined)
    : await getClientPhase(admin, user_id);

  const { error: upsertError } = await admin
    .from("offres_clientes")
    .upsert(
      {
        user_id,
        offre,
        date_debut: dateDebut,
        ...(phase ? { phase } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (upsertError) return { error: upsertError.message, status: 500 };

  const { error: histError } = await admin.from("offres_clientes_historique").insert({
    user_id,
    offre_avant: offreAvant,
    offre_apres: offre,
    hors_ordre: horsOrdre,
    confirmed_by: actorEmail,
  });
  if (histError) return { error: histError.message, status: 500 };

  return { success: true };
}
