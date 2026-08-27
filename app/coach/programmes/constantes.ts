// Catégories et avancement propres aux programmes.
// Volontairement séparés des CATEGORIES des séances (Full Body, Bas du corps…) :
// un programme se range par niveau de pratique (N1/N2) et par position dans le
// parcours (phases puis cycles), pas par zone du corps.

export const PROG_CATEGORIES = [
  { value: "n1", label: "N1" },
  { value: "n2", label: "N2" },
];

export const AVANCEMENTS = [
  { value: "phase_0", label: "Phase 0" },
  { value: "phase_1", label: "Phase 1" },
  { value: "phase_2", label: "Phase 2" },
  { value: "phase_3", label: "Phase 3" },
  { value: "phase_4", label: "Phase 4" },
  { value: "cycle_1", label: "Cycle 1" },
  { value: "cycle_2", label: "Cycle 2" },
  { value: "cycle_3", label: "Cycle 3" },
  { value: "cycle_4", label: "Cycle 4" },
];

/** Les anciens programmes portent une catégorie de séance ("custom", "full_body"…)
 *  qui n'a plus de sens ici : on la traite comme non renseignée. */
export function normaliseProgCategorie(v: unknown): string {
  return PROG_CATEGORIES.some(c => c.value === v) ? (v as string) : "";
}
export function normaliseAvancement(v: unknown): string {
  return AVANCEMENTS.some(a => a.value === v) ? (v as string) : "";
}

export function progCatLabel(v: string) { return PROG_CATEGORIES.find(c => c.value === v)?.label ?? ""; }
export function avancementLabel(v: string) { return AVANCEMENTS.find(a => a.value === v)?.label ?? ""; }
