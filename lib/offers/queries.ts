import type { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { OFFRE_ORDER, type Offre } from "./types";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export function estHorsOrdre(avant: Offre | null, apres: Offre): boolean {
  if (!avant) return false; // première affectation : jamais hors ordre
  return OFFRE_ORDER.indexOf(apres) !== OFFRE_ORDER.indexOf(avant) + 1;
}

export async function getOffresMap(
  admin: AdminClient,
  userIds: string[]
): Promise<Record<string, { offre: Offre; date_debut: string | null }>> {
  const { data } = await admin
    .from("offres_clientes")
    .select("user_id, offre, date_debut")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  return Object.fromEntries(
    (data ?? []).map((o) => [o.user_id, { offre: o.offre as Offre, date_debut: o.date_debut }])
  );
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

  const { error: upsertError } = await admin
    .from("offres_clientes")
    .upsert(
      { user_id, offre, date_debut: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() },
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
