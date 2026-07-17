export interface VideoTestimonial {
  type: "video";
  prenom: string;
  youtubeUrl: string;
  featured?: boolean;
}

export interface QuoteTestimonial {
  type: "quote";
  prenom: string;
  quote: string;
}

export type Testimonial = VideoTestimonial | QuoteTestimonial;

// Vidéos témoignages clientes (programme accompagné Time To Move).
// Julie est mise en avant en premier, comme demandé.
export const VIDEO_TESTIMONIALS: VideoTestimonial[] = [
  { type: "video", prenom: "Julie", youtubeUrl: "https://youtu.be/7FD3UkHIIaE", featured: true },
  { type: "video", prenom: "Sandrine", youtubeUrl: "https://youtu.be/WqTicwy-pT4" },
  { type: "video", prenom: "Karina", youtubeUrl: "https://youtu.be/FpTQjSt_zO8" },
  { type: "video", prenom: "Maria", youtubeUrl: "https://youtu.be/FA-9pQZBhSk" },
  { type: "video", prenom: "Gwen", youtubeUrl: "https://youtu.be/Soeje3pSVCc" },
  { type: "video", prenom: "Lan", youtubeUrl: "https://youtu.be/1V4yHKQsnbE" },
  { type: "video", prenom: "Lolette", youtubeUrl: "https://youtu.be/IBoAF97LLbk" },
];

export const QUOTE_TESTIMONIALS: QuoteTestimonial[] = [
  {
    type: "quote",
    prenom: "Karina",
    quote: "J'ai trouvé le sommeil plus rapidement et plus en forme, la nuit a été meilleure.",
  },
  {
    type: "quote",
    prenom: "Lolette",
    quote: "Je peux vous témoigner que nous sommes très bien accompagnées.",
  },
  {
    type: "quote",
    prenom: "Jemima",
    quote: "Ça ne fait pas si longtemps que j'ai commencé et déjà des résultats.",
  },
  {
    type: "quote",
    prenom: "Mebba",
    quote: "Je me sens bien mieux par rapport à la semaine dernière, plus équilibrée et avec un peu plus d'énergie globalement.",
  },
  {
    type: "quote",
    prenom: "Brigitte",
    quote: "J'adore l'ensemble des recettes, c'est bon et surtout très facile à faire. Et j'ai perdu presque 2 kilos.",
  },
];
