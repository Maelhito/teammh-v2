/**
 * LA SÉRIE — le jeu de régularité de la cliente.
 *
 * Règle : la série compte les séances PRÉVUES au programme qu'elle a validées
 * d'affilée, sans en manquer une. Un jour de repos ne casse donc rien — seule
 * une séance programmée et non faite casse la série.
 *
 * Rien n'est stocké : tout est recalculé depuis la grille des programmes et
 * `seances_log`. Conséquences voulues :
 *   - aucune colonne à maintenir, donc plus de compteur qui se désynchronise ;
 *   - une cliente récupère sa vraie série même rétroactivement ;
 *   - si le coach déplace une séance, la série suit.
 *
 * L'ancien `lib/streak.ts` comptait des JOURS consécutifs : avec 3 séances par
 * semaine, il repartait à 1 à chaque séance. Il n'est plus utilisé côté TTM.
 */

import {
  gridKeyToDate, parseLocalDate, semaineDeCle, toLocalDateStr,
  type DecodedProgramme,
} from "./programme-planning";
import { estSeanceValidee, type SeanceValidee } from "./seances-validees";

/**
 * Une ligne de `seances_log`. L'`id` sert uniquement au dédoublonnage : refaire
 * une séance (bouton « Redémarrer ») ré-enregistre une ligne, et ces doublons
 * ne doivent pas gonfler le compteur de séances.
 */
export interface SeanceLog extends SeanceValidee {
  id?: string | null;
}

/** Nombre de séances RÉELLEMENT distinctes dans le journal. */
function compterDistinctes(logs: SeanceLog[]): number {
  const vues = new Set<string>();
  for (const l of logs) {
    vues.add(
      l.assignment_id && l.grid_key
        ? `${l.assignment_id}:${l.grid_key}`
        : `ligne:${l.id ?? Math.random()}` // vieille ligne sans repère : comptée telle quelle
    );
  }
  return vues.size;
}

/**
 * Le jour de référence, en heure de Paris. Le serveur tourne en UTC : sans ça,
 * entre minuit et 2 h du matin, « aujourd'hui » désignerait encore la veille et
 * la séance du soir serait comptée comme ratée.
 */
function aujourdhuiAParis(now: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

/** Un joker est accordé toutes les N séances enchaînées, et il en tient 2 en réserve. */
const JOKER_TOUS_LES_N = 5;
const JOKERS_MAX = 2;

export interface Palier {
  emoji: string;
  label: string;
  seuil: number;
  mesure: "seances" | "serie";
  obtenu: boolean;
  /** ce qu'il reste à faire pour le décrocher (0 si obtenu) */
  restant: number;
}

export interface SerieInfo {
  /** séances prévues validées d'affilée */
  serie: number;
  /** toutes les séances validées depuis le début */
  totalValidees: number;
  /** jokers en réserve */
  jokers: number;
  /** jokers déjà dépensés pour sauver la série */
  jokersUtilises: number;
  /** une séance est prévue aujourd'hui et n'est pas encore validée */
  seanceDuJourEnAttente: boolean;
  paliers: Palier[];
  /** le palier non obtenu le plus proche */
  prochainPalier: Palier | null;
}

interface Prevue {
  date: string;
  assignmentId: string;
  gridKey: string;
}

/**
 * Toutes les cases de grille qui contiennent au moins une séance, datées.
 * Une case = une séance au sens de la série : c'est la granularité de
 * `seances_log`, qui enregistre (assignation, case) sans l'index de l'item.
 */
function seancesPrevues(programmes: DecodedProgramme[]): Prevue[] {
  const out: Prevue[] = [];

  for (const p of programmes) {
    if (!p.date_debut) continue;
    const debut = parseLocalDate(p.date_debut);

    for (const [gridKey, items] of Object.entries(p.grid)) {
      const semaine = semaineDeCle(gridKey);
      // Le coach peut raccourcir un programme : les semaines au-delà de la durée
      // retenue ne sont plus prévues, elles ne doivent pas casser la série.
      if (!semaine || semaine > p.duree_semaines) continue;

      const aUneSeance = (items ?? []).some(
        (it) => (it as { type?: string })?.type !== "video"
      );
      if (!aUneSeance) continue;

      const date = gridKeyToDate(gridKey, debut);
      if (!date) continue;

      out.push({ date: toLocalDateStr(date), assignmentId: p.id, gridKey });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function construirePaliers(serie: number, total: number): Palier[] {
  const seances: [number, string][] = [
    [1, "Première séance"], [5, "5 séances"], [10, "10 séances"],
    [25, "25 séances"], [50, "50 séances"], [100, "100 séances"],
  ];
  const series: [number, string][] = [
    [3, "3 d'affilée"], [5, "5 d'affilée"], [10, "10 d'affilée"],
    [20, "20 d'affilée"], [30, "30 d'affilée"],
  ];

  return [
    ...seances.map(([seuil, label]) => ({
      emoji: "🏋️", label, seuil, mesure: "seances" as const,
      obtenu: total >= seuil, restant: Math.max(seuil - total, 0),
    })),
    ...series.map(([seuil, label]) => ({
      emoji: "🔥", label, seuil, mesure: "serie" as const,
      obtenu: serie >= seuil, restant: Math.max(seuil - serie, 0),
    })),
  ];
}

/**
 * Calcul pur : on déroule les séances prévues de la plus ancienne à la plus
 * récente. Une séance manquée consomme un joker s'il en reste, sinon elle
 * remet la série à zéro. La séance du jour ne casse rien tant que la journée
 * n'est pas finie.
 */
export function calculerSerie(
  programmes: DecodedProgramme[],
  validees: SeanceLog[],
  now: Date = new Date()
): SerieInfo {
  const aujourdhui = aujourdhuiAParis(now);

  let serie = 0;
  let enchainees = 0;
  let jokers = 0;
  let jokersUtilises = 0;
  let seanceDuJourEnAttente = false;

  for (const prevue of seancesPrevues(programmes)) {
    if (prevue.date > aujourdhui) break; // le futur ne se juge pas

    if (estSeanceValidee(validees, prevue.assignmentId, prevue.gridKey)) {
      serie += 1;
      enchainees += 1;
      if (enchainees % JOKER_TOUS_LES_N === 0 && jokers < JOKERS_MAX) jokers += 1;
    } else if (prevue.date === aujourdhui) {
      seanceDuJourEnAttente = true; // elle a encore la journée devant elle
    } else if (jokers > 0) {
      jokers -= 1;
      jokersUtilises += 1; // le joker absorbe l'oubli, la série tient
    } else {
      serie = 0;
      enchainees = 0;
    }
  }

  const totalValidees = compterDistinctes(validees);
  const paliers = construirePaliers(serie, totalValidees);
  const prochainPalier =
    paliers.filter((p) => !p.obtenu).sort((a, b) => a.restant - b.restant)[0] ?? null;

  return { serie, totalValidees, jokers, jokersUtilises, seanceDuJourEnAttente, paliers, prochainPalier };
}
