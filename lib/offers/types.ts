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
