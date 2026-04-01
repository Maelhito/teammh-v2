import type { ModuleCompletion } from "@/lib/user-profile";

const DELAY_MS = 2 * 24 * 60 * 60 * 1000; // 48h

export interface UnlockStatus {
  slug: string;
  unlocked: boolean;
  /** ISO string — quand ce module sera disponible (null si déjà dispo ou prérequis non remplis) */
  unlocksAt: string | null;
}

/**
 * slugs : tableau ordonné de slugs (module-1 en premier)
 * completions : données de module_completions pour cet utilisateur
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

    // Modules 4–7 : 2 jours après validation du module précédent
    const prevCompleted = completedAt[slugs[i - 1]];
    if (!prevCompleted) {
      return { slug, unlocked: false, unlocksAt: null };
    }

    const unlocksAt = new Date(prevCompleted.getTime() + DELAY_MS);
    if (now >= unlocksAt) {
      return { slug, unlocked: true, unlocksAt: null };
    }
    return { slug, unlocked: false, unlocksAt: unlocksAt.toISOString() };
  });
}
