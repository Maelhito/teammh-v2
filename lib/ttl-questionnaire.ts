/**
 * Questionnaire de démarrage Time To Live — premier devoir du parcours, dans le
 * module 1 « Bienvenue et Objectif ».
 *
 * Les questions doivent parler autant à une cliente qui découvre l'app qu'à une
 * cliente qui sort de Time To Move : rien ne suppose un passé dans l'accompagnement.
 * TTL n'a pas de suivi coach : les réponses servent à la cliente, qui les
 * retrouve dans son profil.
 *
 * Les réponses sont stockées en JSON (table ttl_questionnaire, sql/ttl_questionnaire.sql) :
 * on peut revoir les questions sans migration.
 */

export type TtlQuestionKind = "text" | "nombre" | "textarea" | "note10" | "choix";

export interface TtlQuestion {
  field: string;
  label: string;
  /** libellé court, pour le récapitulatif du profil */
  court: string;
  placeholder?: string;
  /** unité affichée à droite de la réponse (kg, cm, ans, /10) */
  unite?: string;
  kind: TtlQuestionKind;
  options?: string[];
}

export interface TtlQuestionGroup {
  title: string;
  questions: TtlQuestion[];
}

export const TTL_QUESTIONNAIRE_GROUPS: TtlQuestionGroup[] = [
  {
    title: "Toi",
    questions: [
      { field: "prenom", label: "Ton prénom", court: "Prénom", kind: "text", placeholder: "ex : Julie" },
      { field: "age", label: "Ton âge", court: "Âge", kind: "nombre", unite: "ans", placeholder: "ex : 35" },
      { field: "taille", label: "Ta taille", court: "Taille", kind: "nombre", unite: "cm", placeholder: "ex : 165" },
    ],
  },
  {
    title: "Ton objectif",
    questions: [
      {
        field: "objectifs",
        label: "Quels sont tes objectifs ?",
        court: "Mes objectifs",
        kind: "textarea",
        placeholder: "ex : perdre 6 kg, me sentir mieux dans mes vêtements, avoir plus d'énergie…",
      },
      {
        field: "poids_actuel",
        label: "Quel est ton poids aujourd'hui ?",
        court: "Poids au démarrage",
        kind: "nombre",
        unite: "kg",
        placeholder: "ex : 72",
      },
    ],
  },
  {
    title: "Ton sport",
    questions: [
      {
        field: "seances_semaine",
        label: "Combien de séances de sport fais-tu actuellement par semaine ?",
        court: "Séances par semaine au démarrage",
        kind: "choix",
        options: ["Aucune", "1", "2", "3", "4 ou +"],
      },
      {
        field: "blocage",
        label: "Qu'est-ce qui te bloque le plus pour atteindre ton objectif ?",
        court: "Ce qui me bloque le plus",
        kind: "textarea",
        placeholder: "ex : le manque de temps, le grignotage, la motivation qui retombe…",
      },
    ],
  },
  {
    title: "Comment tu te sens en ce moment",
    questions: [
      { field: "confiance", label: "Ta confiance en toi (note sur 10)", court: "Confiance en moi", kind: "note10", unite: "/10" },
      { field: "energie", label: "Ton énergie (note sur 10)", court: "Énergie", kind: "note10", unite: "/10" },
      { field: "sommeil", label: "Ton sommeil (note sur 10)", court: "Sommeil", kind: "note10", unite: "/10" },
    ],
  },
];

export const TTL_QUESTIONS: TtlQuestion[] = TTL_QUESTIONNAIRE_GROUPS.flatMap((g) => g.questions);

export const TTL_QUESTIONNAIRE_TOTAL = TTL_QUESTIONS.length;

export type TtlReponses = Record<string, string>;

/** Ne garde que les questions connues, réponses nettoyées et non vides. */
export function nettoyerReponses(brut: unknown): TtlReponses {
  const src = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const out: TtlReponses = {};
  for (const q of TTL_QUESTIONS) {
    const v = src[q.field];
    if (typeof v === "string" && v.trim() !== "") out[q.field] = v.trim().slice(0, 2000);
  }
  return out;
}

export function compterReponses(reponses: TtlReponses | null): number {
  if (!reponses) return 0;
  return TTL_QUESTIONS.filter((q) => (reponses[q.field] ?? "").trim() !== "").length;
}

export function questionnaireComplet(reponses: TtlReponses | null): boolean {
  return compterReponses(reponses) === TTL_QUESTIONNAIRE_TOTAL;
}
