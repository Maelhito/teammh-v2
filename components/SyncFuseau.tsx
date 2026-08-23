"use client";

import { useEffect } from "react";

const CLE_CACHE = "teammj_fuseau";
/** Au-delà, on resynchronise même si rien ne semble avoir bougé (appareil partagé, session changée). */
const FRAICHEUR_MS = 24 * 60 * 60 * 1000;

/**
 * Tient à jour le fuseau horaire de la personne connectée.
 *
 * Monté dans le layout racine : il couvre la cliente, le coach et l'admin, sur
 * TTM comme sur TTS. C'est ce qui fait qu'une cliente partie en vacances en
 * France voit ses horaires suivre, sans rien avoir à régler.
 *
 * Avant, le fuseau n'était capté qu'au tout premier abonnement push et ne
 * changeait plus jamais.
 */
export default function SyncFuseau() {
  useEffect(() => {
    let annule = false;

    function fuseauAppareil(): string | null {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      } catch {
        return null;
      }
    }

    function dejaSynchronise(tz: string): boolean {
      try {
        const brut = localStorage.getItem(CLE_CACHE);
        if (!brut) return false;
        const cache = JSON.parse(brut) as { timezone?: string; appareil?: string; at?: number };
        // On compare au fuseau de l'APPAREIL au moment du dernier envoi, pas au
        // fuseau retenu par le serveur : quand la personne a forcé son fuseau à
        // la main, les deux diffèrent et comparer au second renverrait une
        // requête à chaque chargement de page.
        const dernierAppareil = cache.appareil ?? cache.timezone;
        return dernierAppareil === tz && typeof cache.at === "number" && Date.now() - cache.at < FRAICHEUR_MS;
      } catch {
        return false;
      }
    }

    async function synchroniser() {
      const tz = fuseauAppareil();
      if (!tz || annule || dejaSynchronise(tz)) return;

      try {
        const res = await fetch("/api/fuseau", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: tz, auto: true }),
        });
        // 403 = personne n'est connectée : normal sur les pages publiques
        // (login, inscription). On ne mémorise rien, pour que la détection
        // reparte d'elle-même dès la connexion, sur la page suivante.
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        // On mémorise le fuseau RETENU par le serveur : si la personne a forcé
        // son fuseau à la main, il diffère de celui de l'appareil, et le
        // mémoriser évite de repousser la même détection à chaque page.
        localStorage.setItem(
          CLE_CACHE,
          JSON.stringify({ timezone: data?.timezone ?? tz, at: Date.now(), appareil: tz })
        );
      } catch {
        // Réseau coupé : sans importance, on retentera au prochain chargement.
      }
    }

    synchroniser();

    // Un vol Nouméa → Paris se termine souvent avec l'app ouverte en fond :
    // au retour au premier plan, le fuseau de l'appareil a changé.
    function auRetour() {
      if (document.visibilityState === "visible") synchroniser();
    }
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      annule = true;
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, []);

  return null;
}
