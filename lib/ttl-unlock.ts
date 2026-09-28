import type { TtlModule } from "@/lib/ttl";

export interface TtlEtatModule {
  /** Le module a du contenu (une vidéo, ou le questionnaire). Sinon : « Bientôt disponible », verrouillé. */
  pret: boolean;
  /** Le premier module porte le questionnaire de démarrage : c'est le premier devoir. */
  avecQuestionnaire: boolean;
  debloque: boolean;
  termine: boolean;
  /** Étapes faites / total (chaque vidéo, plus le questionnaire s'il y en a un). */
  faites: number;
  total: number;
}

/**
 * Parcours linéaire imposé :
 *   - le module 1 contient le questionnaire de démarrage : il est terminé quand
 *     ses vidéos sont vues ET le questionnaire rempli ;
 *   - un module s'ouvre quand le précédent est terminé ;
 *   - un module sans vidéo n'est pas encore prêt : il reste verrouillé
 *     (« Bientôt disponible ») et bloque la suite, jusqu'à ce qu'on y ajoute
 *     une vidéo depuis l'admin.
 *
 * Une cliente qui a déjà commencé un module (au moins une vidéo vue) le garde
 * ouvert : un changement de règle ne la renvoie jamais en arrière.
 */
export function computeTtlParcours(
  modules: Pick<TtlModule, "videos">[],
  watchedIds: Set<string>,
  questionnaireFait: boolean
): TtlEtatModule[] {
  const etats: TtlEtatModule[] = [];
  modules.forEach((m, i) => {
    const avecQuestionnaire = i === 0;
    const pret = m.videos.length > 0 || avecQuestionnaire;
    const vues = m.videos.filter((v) => watchedIds.has(v.id)).length;
    const faites = vues + (avecQuestionnaire && questionnaireFait ? 1 : 0);
    const total = m.videos.length + (avecQuestionnaire ? 1 : 0);
    const termine = pret && faites === total;
    const dejaCommence = vues > 0;
    const debloque = pret && (i === 0 || etats[i - 1].termine || dejaCommence);
    etats.push({ pret, avecQuestionnaire, debloque, termine, faites, total });
  });
  return etats;
}

/** Le parcours de démarrage est fini : tous les modules disponibles sont terminés. */
export function ttlParcoursTermine(etats: TtlEtatModule[]): boolean {
  const prets = etats.filter((e) => e.pret);
  return prets.length > 0 && prets.every((e) => e.termine);
}
