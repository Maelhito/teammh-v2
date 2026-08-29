export interface TtlBadge {
  emoji: string;
  label: string;
  earned: boolean;
  category: string;
}

interface ComputeBadgesParams {
  hasWatchedAny: boolean;
  onboardingDone: boolean;
  seancesValidees: number;
  streakCurrent: number;
  joursDepuisDebut: number;
}

export function computeTtlBadges({ hasWatchedAny, onboardingDone, seancesValidees, streakCurrent, joursDepuisDebut }: ComputeBadgesParams): TtlBadge[] {
  return [
    { emoji: "🚀", label: "Premier pas", earned: hasWatchedAny, category: "Démarrage" },
    { emoji: "🎓", label: "Onboarding terminé", earned: onboardingDone, category: "Démarrage" },

    { emoji: "🏋️", label: "1 séance", earned: seancesValidees >= 1, category: "Séances" },
    { emoji: "🏋️", label: "3 séances", earned: seancesValidees >= 3, category: "Séances" },
    { emoji: "🏋️", label: "10 séances", earned: seancesValidees >= 10, category: "Séances" },
    { emoji: "🏋️", label: "25 séances", earned: seancesValidees >= 25, category: "Séances" },
    { emoji: "🏋️", label: "50 séances", earned: seancesValidees >= 50, category: "Séances" },

    { emoji: "🔥", label: "3 jours de suite", earned: streakCurrent >= 3, category: "Régularité" },
    { emoji: "🔥", label: "7 jours de suite", earned: streakCurrent >= 7, category: "Régularité" },
    { emoji: "🔥", label: "14 jours de suite", earned: streakCurrent >= 14, category: "Régularité" },
    { emoji: "🔥", label: "30 jours de suite", earned: streakCurrent >= 30, category: "Régularité" },
    { emoji: "🔥", label: "60 jours de suite", earned: streakCurrent >= 60, category: "Régularité" },

    { emoji: "🌱", label: "Une semaine", earned: joursDepuisDebut >= 7, category: "Ancienneté" },
    { emoji: "⭐", label: "Fidèle (1 mois)", earned: joursDepuisDebut >= 30, category: "Ancienneté" },
    { emoji: "👑", label: "Pilier (3 mois)", earned: joursDepuisDebut >= 90, category: "Ancienneté" },
  ];
}

/** Le badge non encore obtenu le plus proche d'être débloqué, pour le mettre en avant (ex: récap hebdo). */
export function nextBadgeToUnlock(badges: TtlBadge[]): TtlBadge | null {
  return badges.find((b) => !b.earned) ?? null;
}
