export type Offre = "TTM" | "TTL";

export const OFFRE_ORDER: Offre[] = ["TTM", "TTL"];

export const OFFRE_LABEL: Record<Offre, string> = {
  TTM: "Time To Move",
  TTL: "Time To Last",
};

export const OFFRE_COLOR: Record<Offre, string> = {
  TTM: "#3B82F6",
  TTL: "#22C55E",
};
