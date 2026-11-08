/** Motifs proposés dans le questionnaire d'arrêt Time To Live. */
export const TTL_MOTIFS_ARRET = [
  "Le prix",
  "Je n'ai plus le temps",
  "Je n'ai pas vu assez de résultats",
  "J'ai atteint mon objectif",
  "Le contenu ne me convient plus",
  "Il me manque de l'accompagnement",
  "Un problème avec l'application",
  "Autre raison",
];

export const TTL_REVIENDRAIT_LABELS: Record<string, string> = {
  oui: "Oui, probablement",
  peut_etre: "Peut-être",
  non: "Non",
};

export interface TtlResiliation {
  motifs: string[];
  satisfaction: number | null;
  commentaire: string | null;
  reviendrait: string | null;
}

/** Résumé d'une ligne pour la colonne « Motif d'arrêt TTL » de Notion. */
export function resumeResiliation(r: TtlResiliation): string {
  const parts: string[] = [];
  if (r.motifs.length) parts.push(r.motifs.join(", "));
  if (r.satisfaction) parts.push(`Satisfaction ${r.satisfaction}/5`);
  if (r.reviendrait) parts.push(`Reviendrait : ${TTL_REVIENDRAIT_LABELS[r.reviendrait] ?? r.reviendrait}`);
  if (r.commentaire) parts.push(`« ${r.commentaire} »`);
  return parts.join(" — ");
}
