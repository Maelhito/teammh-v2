/**
 * Preuves sociales réelles (clientes Team MJ).
 *
 * Les chiffres et les phrases viennent des retours clientes rassemblés dans le
 * Drive "Preuves sociales". Ils ont été obtenus avec l'accompagnement complet
 * Team MJ — la page le dit noir sur blanc, on ne laisse pas croire que l'app
 * seule produit ces résultats.
 */

export interface Resultat {
  prenom: string;
  kg: string;
  duree?: string;
}

export const RESULTATS: Resultat[] = [
  { prenom: "Emma", kg: "15", duree: "8 mois" },
  { prenom: "Julie", kg: "13,4", duree: "7 mois" },
  { prenom: "Sabrina", kg: "12", duree: "6 mois" },
  { prenom: "Karin", kg: "10,2", duree: "6 mois" },
  { prenom: "Sandrine", kg: "9,7" },
  { prenom: "Gwen", kg: "9" },
  { prenom: "Judith", kg: "8", duree: "4 mois" },
  { prenom: "Maria", kg: "8", duree: "4 mois" },
  { prenom: "Brigitte", kg: "8", duree: "4 mois" },
  { prenom: "Poe", kg: "8" },
  { prenom: "Diane", kg: "7" },
  { prenom: "Sandu", kg: "6,5" },
  { prenom: "Karina", kg: "6,3" },
  { prenom: "Maroua", kg: "6,2" },
  { prenom: "Siyana", kg: "5,7" },
  { prenom: "Lan", kg: "5,5" },
  { prenom: "Melissa", kg: "5,3" },
  { prenom: "Cicilia", kg: "4,3" },
  { prenom: "Sefola", kg: "3,3" },
];

export interface Temoignage {
  prenom: string;
  meta: string;
  texte: string;
}

export const TEMOIGNAGES: Temoignage[] = [
  {
    prenom: "Emma",
    meta: "−15 kg en 8 mois",
    texte:
      "Cela fait huit mois que je les suis, et le résultat est incroyable : j'ai perdu 15 kg ! Mais au-delà de la perte de poids, ce que j'apprécie le plus, c'est l'accompagnement. On est suivi du début à la fin, avec beaucoup de conseils, de soutien et de motivation.",
  },
  {
    prenom: "Karin",
    meta: "−10,2 kg en 6 mois",
    texte:
      "Merci, super contente du coaching sportif et alimentaire. C'est vraiment ce qu'il me fallait. Le bon moment.",
  },
  {
    prenom: "Sandy",
    meta: "Cliente Team MJ",
    texte:
      "Le plus beau cadeau que je me suis fait cette année, c'est ce coaching avec vous.",
  },
  {
    prenom: "Melissa",
    meta: "−5,3 kg",
    texte:
      "Une équipe pro, et pas superficielle : tout ce que je cherchais. J'avais réellement besoin de vous pour me remettre dans le droit chemin, et vous y êtes arrivés.",
  },
  {
    prenom: "Laetitia",
    meta: "Après 6 mois",
    texte:
      "J'ai revu une amie que je n'avais pas vue depuis le début, il y a six mois. Sa réaction : « mais t'as perdu, t'as dégonflé, t'as maigri ! » Même quand vous doutez, vos efforts seront payants.",
  },
  {
    prenom: "Julie",
    meta: "−13,4 kg en 7 mois",
    texte: "Le nouveau plan alimentaire est incroyable. Et deux séances sur trois… non, trois sur trois !",
  },
  {
    prenom: "Caroll",
    meta: "Passée sous les 70 kg",
    texte: "Et champagne ! Je suis passée sous les 70 kg !",
  },
  {
    prenom: "Maroua",
    meta: "−6,2 kg",
    texte:
      "Super, cette première étape franchie avec vous la team. Merci pour votre suivi et vos encouragements.",
  },
  {
    prenom: "Romy",
    meta: "−3 kg sur le premier cycle",
    texte: "Mon mari n'a pas arrêté de me dire que j'avais bien fondu.",
  },
];

/** Prénoms des clientes qui ont enregistré un témoignage vidéo. */
export const VIDEOS = [
  "Sandrine",
  "Karina",
  "Sandy",
  "Judith",
  "Lolette",
  "Lan",
  "Gwen",
  "Maria",
  "Julie",
  "Poe",
  "Titikua",
  "Romy",
];

/**
 * Courbe décorative de perte de poids. Volontairement sans axes ni valeurs :
 * le chiffre annoncé est réel, le tracé n'est qu'une illustration — on ne
 * fabrique pas de fausses mesures hebdomadaires.
 */
export function Courbe({ seed }: { seed: number }) {
  const pts: string[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 116 + 2;
    const base = 8 + (i / (n - 1)) * 30;
    const wobble = Math.sin(seed * 1.7 + i * 1.3) * 2.4;
    pts.push(`${x.toFixed(1)},${Math.min(42, Math.max(5, base + wobble)).toFixed(1)}`);
  }
  const ligne = `M ${pts.join(" L ")}`;
  const aire = `${ligne} L 118,48 L 2,48 Z`;
  const id = `vgrad${seed}`;

  return (
    <svg viewBox="0 0 120 48" className="v-courbe" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E63946" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#E63946" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={aire} fill={`url(#${id})`} />
      <path d={ligne} fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="3" fill="#E63946" />
    </svg>
  );
}
