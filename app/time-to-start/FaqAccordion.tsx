"use client";

import { useState } from "react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "C'est pas un abonnement piège ? Comment je résilie ?",
    a: "Tu résilies en 2 clics depuis ton profil, à tout moment. Pas d'appel à passer, pas d'email à envoyer.",
  },
  {
    q: "Le paiement est sécurisé ?",
    a: "Le paiement passe par Stripe, une des solutions de paiement les plus utilisées au monde. Tes coordonnées bancaires ne transitent jamais par nous.",
  },
  {
    q: "Qui êtes-vous vraiment ?",
    a: "Mael et Julie, coachs à Nouméa. Julie coache depuis 4 ans, et ensemble on a déjà accompagné plus de 90 mamans avec Time To Move, notre programme coaché.",
  },
  {
    q: "Ça marche sur mon téléphone ? Je dois télécharger un truc compliqué ?",
    a: "Non, ça s'installe en un clic depuis ton navigateur. Aucun store, aucune application à chercher.",
  },
  {
    q: "Je n'ai pas le temps.",
    a: "Les séances durent 30 à 45 minutes, 3 fois par semaine. Pensées pour rentrer dans une vraie journée de maman débordée.",
  },
  {
    q: "Et si je n'y arrive pas seule ?",
    a: "Tu as le live mensuel et la communauté pour ne jamais être seule. Et si tu veux un accompagnement plus poussé, avec un coach qui ajuste ton programme chaque semaine, Time To Move existe pour ça.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="tts-faq-list">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="tts-faq-item" key={item.q}>
            <button
              className="tts-faq-q"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span className="tts-faq-icon">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <p className="tts-faq-a">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
