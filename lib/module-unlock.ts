import type { ModuleCompletion } from "@/lib/user-profile";

// Seul délai : 2h entre module 3 et module 4 (index 2→3)
const DELAY_MODULE4_MS = 2 * 60 * 60 * 1000; // 2h

export interface UnlockStatus {
  slug: string;
  unlocked: boolean;
  /** ISO string — quand ce module sera disponible (null si déjà dispo ou prérequis non remplis) */
  unlocksAt: string | null;
}

/**
 * slugs : tableau ordonné de slugs (module-1 en premier)
 * completions : données de module_completions pour cet utilisateur
 *
 * Règles :
 *   i=0,1  → toujours accessible (modules 1 et 2)
 *   i=2    → accessible quand modules 1 ET 2 validés (module 3)
 *   i=3    → accessible 2h après validation du module 3 (module 4)
 *   i≥4    → accessible immédiatement après validation du module précédent
 */
export function computeUnlockStatuses(
  slugs: string[],
  completions: ModuleCompletion[]
): UnlockStatus[] {
  const completedAt: Record<string, Date> = {};
  for (const c of completions) {
    completedAt[c.module_slug] = new Date(c.completed_at);
  }

  const now = new Date();

  return slugs.map((slug, i) => {
    // Modules 1 et 2 : toujours accessibles
    if (i === 0 || i === 1) {
      return { slug, unlocked: true, unlocksAt: null };
    }

    // Module 3 : débloqué quand modules 1 ET 2 sont validés
    if (i === 2) {
      const done = !!completedAt[slugs[0]] && !!completedAt[slugs[1]];
      return { slug, unlocked: done, unlocksAt: null };
    }

    // Module 4 (i=3) : 2 heures après validation du module 3
    if (i === 3) {
      const prevCompleted = completedAt[slugs[2]]; // module 3
      if (!prevCompleted) return { slug, unlocked: false, unlocksAt: null };
      const unlocksAt = new Date(prevCompleted.getTime() + DELAY_MODULE4_MS);
      if (now >= unlocksAt) return { slug, unlocked: true, unlocksAt: null };
      return { slug, unlocked: false, unlocksAt: unlocksAt.toISOString() };
    }

    // Modules 5-8 (i≥4) : immédiatement après validation du module précédent
    const prevCompleted = completedAt[slugs[i - 1]];
    if (!prevCompleted) return { slug, unlocked: false, unlocksAt: null };
    return { slug, unlocked: true, unlocksAt: null };
  });
}
