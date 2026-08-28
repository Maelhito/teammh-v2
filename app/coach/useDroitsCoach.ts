"use client";

import { useEffect, useState } from "react";

/**
 * « Ai-je le droit de toucher à la bibliothèque partagée ? »
 *
 * Programmes, séances et exercices sont communs à toute l'équipe : seuls les
 * admins les modifient, dupliquent ou suppriment. Un coach les consulte et les
 * assigne — ses adaptations pour une cliente vivent dans la copie de cette
 * cliente, pas dans le modèle.
 *
 * Renvoie `false` tant que la réponse n'est pas arrivée : on préfère masquer un
 * bouton une fraction de seconde de trop que le montrer à quelqu'un qui n'a pas
 * le droit de s'en servir.
 */
export function usePeutModifierBibliotheque(): boolean {
  const [peut, setPeut] = useState(false);

  useEffect(() => {
    // `dev_role=coach` (développement uniquement) permet de voir l'écran tel
    // qu'un coach le voit, sans changer de compte.
    const devRole = new URLSearchParams(window.location.search).get("dev_role");
    const url = devRole ? `/api/coach/droits?dev_role=${encodeURIComponent(devRole)}` : "/api/coach/droits";
    let vivant = true;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (vivant) setPeut(d.peutModifierBibliotheque === true); })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  return peut;
}
