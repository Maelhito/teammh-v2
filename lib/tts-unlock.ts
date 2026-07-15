import type { TtsModule } from "@/lib/tts";

/**
 * Parcours linéaire imposé : un module d'onboarding se débloque une fois
 * toutes les vidéos du module précédent marquées comme vues.
 * Le premier module est toujours accessible. Un module sans vidéo ne bloque
 * jamais le suivant.
 */
export function computeTtsModuleUnlock(
  modules: Pick<TtsModule, "videos">[],
  watchedIds: Set<string>
): boolean[] {
  return modules.map((m, i) => {
    if (i === 0) return true;
    const prev = modules[i - 1];
    if (prev.videos.length === 0) return true;
    return prev.videos.every((v) => watchedIds.has(v.id));
  });
}
