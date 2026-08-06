import type { ModuleCompletion } from "@/lib/user-profile";

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
