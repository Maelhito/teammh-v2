export const TTL_OBJECTIF_OPTIONS = [
  { value: "perdre_poids", label: "Perdre du poids", emoji: "🔥" },
  { value: "se_muscler", label: "Se muscler, se tonifier", emoji: "💪" },
  { value: "energie", label: "Retrouver de l'énergie", emoji: "⚡" },
  { value: "habitudes", label: "Créer de bonnes habitudes", emoji: "🌱" },
  { value: "autre", label: "Autre", emoji: "✨" },
] as const;

export type TtlObjectifValue = (typeof TTL_OBJECTIF_OPTIONS)[number]["value"];

export function ttlObjectifLabel(value: string | null): string | null {
  return TTL_OBJECTIF_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

export function ttlObjectifEmoji(value: string | null): string | null {
  return TTL_OBJECTIF_OPTIONS.find((o) => o.value === value)?.emoji ?? null;
}

const TTL_OBJECTIF_TAGLINES: Record<TtlObjectifValue, string> = {
  perdre_poids: "Chaque séance te rapproche de ton objectif : perdre du poids.",
  se_muscler: "On construit du muscle, séance après séance.",
  energie: "Objectif : retrouver ton énergie, un jour à la fois.",
  habitudes: "On construit de bonnes habitudes, ensemble.",
  autre: "Chaque jour compte pour atteindre ton objectif.",
};

export function ttlObjectifTagline(value: string | null): string | null {
  if (!value) return null;
  return TTL_OBJECTIF_TAGLINES[value as TtlObjectifValue] ?? null;
}
