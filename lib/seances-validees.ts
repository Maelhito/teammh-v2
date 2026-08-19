/**
 * « Cette séance a-t-elle été validée ? » — règle unique, cliente et coach.
 *
 * Une séance est identifiée par le couple (assignation, case de grille). C'est
 * ce couple que l'app cliente enregistre dans `seances_log` au moment du
 * « séance terminée », et c'est le seul identifiant fiable.
 *
 * Il existait un repli par NOM de séance. Il faisait des faux positifs : les
 * programmes répètent les mêmes intitulés d'une semaine à l'autre, donc valider
 * « Séance 1 : Full Body » une fois marquait comme faites toutes les « Séance 1 :
 * Full Body » du calendrier, y compris à venir. Ce repli est supprimé : mieux
 * vaut ne pas afficher une validation que d'en afficher une fausse.
 *
 * Conséquence assumée : les entrées anciennes de `seances_log` sans
 * `assignment_id` (avant que le champ existe) ne marquent plus rien.
 */

export interface SeanceValidee {
  grid_key: string | null;
  assignment_id: string | null;
}

export function estSeanceValidee(
  validees: SeanceValidee[],
  assignmentId: string | null | undefined,
  gridKey: string | null | undefined
): boolean {
  if (!assignmentId || !gridKey) return false;
  return validees.some(
    (v) => v.assignment_id === assignmentId && v.grid_key === gridKey
  );
}
