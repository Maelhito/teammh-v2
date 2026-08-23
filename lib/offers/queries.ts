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
 * Phase de démarrage d'une seule cliente. Renvoie 'demarree' par défaut (accès complet)
 * si aucune ligne / colonne absente — jamais de blocage accidentel de l'existant.
 */
export async function getClientPhase(admin: AdminClient, userId: string): Promise<Phase> {
  const map = await getOffresMap(admin, [userId]);
  return map[userId]?.phase ?? "demarree";
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
    .select("offre")
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
  const { error: upsertError } = await admin
    .from("offres_clientes")
    .upsert(
      { user_id, offre, date_debut: dateDebut, updated_at: new Date().toISOString() },
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
