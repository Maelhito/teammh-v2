// Une tâche vit 7 jours à partir de sa création, validée ou non : passé ce
// délai elle disparaît de l'accueil de la cliente (elle reste dans le calendrier).
export const DUREE_DE_VIE_TACHE_MS = 7 * 24 * 60 * 60 * 1000;

// Nombre maximum de tâches en vie en même temps pour une cliente.
export const MAX_TACHES_EN_COURS = 5;

/** Date ISO avant laquelle une tâche créée est expirée. */
export function limiteDeVieTache() {
  return new Date(Date.now() - DUREE_DE_VIE_TACHE_MS).toISOString();
}

// ─── Tâches récurrentes ───────────────────────────────────────────────────────

// Une tâche récurrente ne s'éteint pas au bout de 7 jours : elle revient tant
// que le coach ne la supprime pas. Elle ne compte donc pas dans les 5 tâches
// « en vie », mais a son propre plafond.
export const MAX_TACHES_RECURRENTES = 10;

export type Motif = "none" | "daily" | "weekly" | "monthly";

/** Les rythmes proposés au coach. `mois` = tous les N mois, le jour de la date de départ. */
export const RYTHMES_TACHE = [
  { key: "none",       label: "Une seule fois",                  recurrence: "none",    intervalle: 1 },
  { key: "daily",      label: "Tous les jours",                  recurrence: "daily",   intervalle: 1 },
  { key: "weekly",     label: "Toutes les semaines",             recurrence: "weekly",  intervalle: 1 },
  { key: "weekly-2",   label: "Toutes les 2 semaines",           recurrence: "weekly",  intervalle: 2 },
  { key: "weekly-3",   label: "Toutes les 3 semaines",           recurrence: "weekly",  intervalle: 3 },
  { key: "weekly-4",   label: "Toutes les 4 semaines",           recurrence: "weekly",  intervalle: 4 },
  { key: "monthly",    label: "Tous les mois (même jour)",       recurrence: "monthly", intervalle: 1 },
  { key: "monthly-2",  label: "Tous les 2 mois (même jour)",     recurrence: "monthly", intervalle: 2 },
  { key: "monthly-3",  label: "Tous les 3 mois (même jour)",     recurrence: "monthly", intervalle: 3 },
] as const;

export function cleRythme(recurrence: string | null | undefined, intervalle: number | null | undefined): string {
  const n = intervalle && intervalle > 1 ? intervalle : 1;
  const trouve = RYTHMES_TACHE.find((r) => r.recurrence === (recurrence ?? "none") && r.intervalle === n);
  return trouve?.key ?? (recurrence && recurrence !== "none" ? recurrence : "none");
}

/** Lit un rythme venu du client ; refuse tout ce qui n'est pas dans la liste. */
export function lireRythme(
  recurrence: unknown,
  intervalle: unknown
): { recurrence: Motif; intervalle: number } | null {
  const n = typeof intervalle === "number" && Number.isInteger(intervalle) && intervalle >= 1 ? intervalle : 1;
  const r = RYTHMES_TACHE.find((x) => x.recurrence === recurrence && x.intervalle === n);
  return r ? { recurrence: r.recurrence, intervalle: r.intervalle } : null;
}

/** « Tous les jours », « Toutes les 2 semaines »… — pour l'affichage. */
export function libelleRythme(recurrence: string | null | undefined, intervalle: number | null | undefined): string | null {
  if (!recurrence || recurrence === "none") return null;
  const r = RYTHMES_TACHE.find((x) => x.key === cleRythme(recurrence, intervalle));
  return r ? r.label.replace(" (même jour)", "") : null;
}
