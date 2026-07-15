export interface Testimonial {
  type: "video" | "photo";
  prenom: string;
  source: "tts" | "ttm";
  quote?: string;
  mediaUrl?: string | null;
}

// Ajoute une entrée ici pour chaque nouveau témoignage (photo ou vidéo).
// mediaUrl reste vide tant que le fichier réel n'est pas fourni : la carte
// s'affiche alors comme un emplacement à remplir plutôt que de planter.
export const TESTIMONIALS: Testimonial[] = [
  { type: "video", prenom: "Prénom à venir", source: "ttm", mediaUrl: null },
  { type: "photo", prenom: "Prénom à venir", source: "ttm", quote: "Témoignage à intégrer.", mediaUrl: null },
  { type: "video", prenom: "Prénom à venir", source: "ttm", mediaUrl: null },
  { type: "photo", prenom: "Prénom à venir", source: "ttm", quote: "Témoignage à intégrer.", mediaUrl: null },
  { type: "photo", prenom: "Prénom à venir", source: "ttm", quote: "Témoignage à intégrer.", mediaUrl: null },
  { type: "video", prenom: "Prénom à venir", source: "ttm", mediaUrl: null },
  { type: "photo", prenom: "Prénom à venir", source: "ttm", quote: "Témoignage à intégrer.", mediaUrl: null },
  { type: "photo", prenom: "Prénom à venir", source: "ttm", quote: "Témoignage à intégrer.", mediaUrl: null },
];
