// Une tâche vit 7 jours à partir de sa création, validée ou non : passé ce
// délai elle disparaît de l'accueil de la cliente (elle reste dans le calendrier).
export const DUREE_DE_VIE_TACHE_MS = 7 * 24 * 60 * 60 * 1000;

// Nombre maximum de tâches en vie en même temps pour une cliente.
export const MAX_TACHES_EN_COURS = 5;

/** Date ISO avant laquelle une tâche créée est expirée. */
export function limiteDeVieTache() {
  return new Date(Date.now() - DUREE_DE_VIE_TACHE_MS).toISOString();
}
