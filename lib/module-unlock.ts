import type { ModuleCompletion } from "@/lib/user-profile";
import type { Phase } from "@/lib/offers/types";

// Slug du module de démarrage : seul module accessible pendant la phase 'demarrage'.
export const MODULE_DEMARRAGE_SLUG = "module-0";

export interface UnlockStatus {
  slug: string;
  unlocked: boolean;
  /** ISO string — quand ce module sera disponible (null si déjà dispo ou prérequis non remplis) */
  unlocksAt: string | null;
}

/**
 * Tous les modules sont accessibles librement, sans ordre ni délai.
 */
export function computeUnlockStatuses(
  slugs: string[],
  _completions: ModuleCompletion[]
): UnlockStatus[] {
  return slugs.map((slug) => ({ slug, unlocked: true, unlocksAt: null }));
}

/**
 * Verrouillage lié à la phase de démarrage.
 *   - phase 'demarrage' : seul module-0 (module de démarrage) est accessible,
 *     tout le reste est verrouillé (la cliente doit d'abord faire son démarrage).
 *   - phase 'demarree'  : on conserve les statuts normaux (accès complet).
 */
export function applyPhaseGate(statuses: UnlockStatus[], phase: Phase): UnlockStatus[] {
  if (phase !== "demarrage") return statuses;
  return statuses.map((s) =>
    s.slug === MODULE_DEMARRAGE_SLUG
      ? { ...s, unlocked: true, unlocksAt: null }
      : { ...s, unlocked: false, unlocksAt: null }
  );
}
