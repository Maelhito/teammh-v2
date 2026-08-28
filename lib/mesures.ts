/**
 * Suivi des mesures TTM : poids + mensurations (toutes les 2 semaines) et
 * photos de progression (libres).
 */

export const INTERVALLE_JOURS = 14;

export interface Mesure {
  id: string;
  date: string; // YYYY-MM-DD
  poids: number | null;
  tour_taille: number | null;
  tour_hanches: number | null;
  tour_poitrine: number | null;
  note: string | null;
}

export type MesureChamp =
  | "poids"
  | "tour_taille"
  | "tour_hanches"
  | "tour_poitrine";

export interface ChampDef {
  champ: MesureChamp;
  label: string;
  unite: "kg" | "cm";
  placeholder: string;
  /** mis en avant : poids et tour de taille sont les 2 indicateurs clés */
  cle?: boolean;
}

/**
 * Les mesures demandées à la cliente. Cette liste commande TOUT : le formulaire
 * cliente, celui du coach, l'historique et les champs acceptés par l'API.
 *
 * Le tour de cuisse et le tour de bras en ont été retirés — la page était trop
 * chargée. Leurs colonnes restent en base : les valeurs déjà saisies ne sont
 * pas détruites, elles ne sont simplement plus demandées ni affichées.
 */
export const CHAMPS: ChampDef[] = [
  { champ: "poids", label: "Poids", unite: "kg", placeholder: "68.4", cle: true },
  { champ: "tour_taille", label: "Tour de taille", unite: "cm", placeholder: "78", cle: true },
  { champ: "tour_hanches", label: "Tour de hanches", unite: "cm", placeholder: "98" },
  { champ: "tour_poitrine", label: "Tour de poitrine", unite: "cm", placeholder: "92" },
];

export const ANGLES = [
  { angle: "face" as const, label: "Face" },
  { angle: "profil" as const, label: "Profil" },
  { angle: "dos" as const, label: "Dos" },
];

export type Angle = (typeof ANGLES)[number]["angle"];

export interface PhotoProgression {
  id: string;
  date: string;
  angle: Angle;
  /** URL signée temporaire (le bucket est privé) */
  url: string;
}

/** Mesures triées de la plus ancienne à la plus récente */
export function trierParDate(mesures: Mesure[]): Mesure[] {
  return [...mesures].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Écart d'un champ entre la dernière mesure et la précédente, et depuis la toute
 * première. Renvoie null quand la donnée manque (pas d'invention de chiffre).
 */
export function ecarts(mesures: Mesure[], champ: MesureChamp): {
  actuel: number | null;
  vsPrecedent: number | null;
  vsDepart: number | null;
} {
  const avecValeur = trierParDate(mesures).filter((m) => m[champ] != null);
  if (avecValeur.length === 0) return { actuel: null, vsPrecedent: null, vsDepart: null };

  const actuel = Number(avecValeur[avecValeur.length - 1][champ]);
  const precedent = avecValeur.length > 1 ? Number(avecValeur[avecValeur.length - 2][champ]) : null;
  const depart = Number(avecValeur[0][champ]);

  return {
    actuel,
    vsPrecedent: precedent === null ? null : arrondi(actuel - precedent),
    vsDepart: avecValeur.length > 1 ? arrondi(actuel - depart) : null,
  };
}

function arrondi(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Date de la prochaine prise de mesures (dernière + 14 jours) */
export function prochaineMesure(mesures: Mesure[]): { date: Date; joursRestants: number } | null {
  const triees = trierParDate(mesures);
  if (!triees.length) return null;

  const derniere = new Date(triees[triees.length - 1].date + "T00:00:00");
  const date = new Date(derniere);
  date.setDate(date.getDate() + INTERVALLE_JOURS);

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const joursRestants = Math.ceil((date.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24));

  return { date, joursRestants };
}

/** Formate un écart avec son signe : -1.2, +0.4, ou "=" */
export function formatEcart(v: number | null, unite: string): string {
  if (v === null) return "—";
  if (v === 0) return `= ${unite}`;
  return `${v > 0 ? "+" : ""}${v} ${unite}`;
}

/**
 * Pour poids et mensurations, une baisse est une progression positive.
 * Renvoie la couleur d'affichage d'un écart.
 */
export function couleurEcart(v: number | null): string {
  if (v === null || v === 0) return "#6B7280";
  return v < 0 ? "#4ADE80" : "#F59E0B";
}
