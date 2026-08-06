export type Offre = "TTS" | "TTM" | "TTL";

export const OFFRE_ORDER: Offre[] = ["TTS", "TTM", "TTL"];

export const OFFRE_LABEL: Record<Offre, string> = {
  TTS: "Time To Start",
  TTM: "Time To Move",
  TTL: "Time To Last",
};

export const OFFRE_COLOR: Record<Offre, string> = {
  TTS: "#22C55E",
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
