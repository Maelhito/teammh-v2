export type Offre = "TTM" | "TTL";

// Ordre normal du parcours : l'accompagnement d'abord, puis Time To Last.
// Toute transition qui ne suit pas cet ordre est signalée à l'admin.
export const OFFRE_ORDER: Offre[] = ["TTM", "TTL"];

export const OFFRE_LABEL: Record<Offre, string> = {
  TTM: "Time To Move",
  TTL: "Time To Last",
};

export const OFFRE_COLOR: Record<Offre, string> = {
  TTM: "#3B82F6",
  TTL: "#B22222",
};

// ─── Phase de démarrage TTM ──────────────────────────────────────────────────
// 'demarrage' : nouvelle cliente, tout verrouillé sauf le module de démarrage.
// 'demarree'  : accès complet (activé manuellement par le coach après l'appel de démarrage).
export type Phase = "demarrage" | "demarree";

export const PHASE_LABEL: Record<Phase, string> = {
  demarrage: "En démarrage",
  demarree: "Démarrée",
};

export const PHASE_COLOR: Record<Phase, string> = {
  demarrage: "#F59E0B", // ambre
  demarree: "#22C55E",  // vert
};
