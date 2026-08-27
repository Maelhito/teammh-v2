/**
 * « Ce programme est-il fini ? » — règle unique, cliente et coach.
 *
 * Un programme assigné restait « en cours » indéfiniment : même une fois les
 * 3 séances sur 3 validées, il fallait cliquer « Marquer terminé » à la main,
 * sinon la fiche cliente affichait toujours un programme en cours et on ne
 * savait plus à qui attribuer la suite.
 *
 * Le repère est le même que celui affiché sur la fiche : séances effectuées
 * contre séances prévues dans la fenêtre retenue pour CETTE cliente (le coach
 * peut raccourcir un programme de 4 semaines à 2 — les semaines au-delà ne
 * comptent pas).
 */

import { semaineDeCle } from "./programme-planning";

/** Séances réellement prévues : les cases hors de la durée retenue sont ignorées. */
export function totalSeancesPrevues(
  grid: Record<string, unknown[]> | null | undefined,
  dureeSemaines: number,
): number {
  return Object.entries(grid ?? {}).reduce((total, [cle, items]) => {
    const semaine = semaineDeCle(cle);
    return semaine >= 1 && semaine <= dureeSemaines ? total + (items ?? []).length : total;
  }, 0);
}

/**
 * Un programme sans aucune séance prévue n'est jamais « achevé » : sinon une
 * grille vide (programme en préparation) basculerait aussitôt en terminé.
 */
export function programmeAcheve(seancesEffectuees: number, totalPrevu: number): boolean {
  return totalPrevu > 0 && seancesEffectuees >= totalPrevu;
}
