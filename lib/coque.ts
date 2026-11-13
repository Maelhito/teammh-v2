/**
 * La « coque » : l'app publiée sur l'App Store et Google Play. C'est le site,
 * affiché dans une enveloppe native qui ajoute ce marqueur à son identifiant
 * de navigateur (user-agent). C'est lui qui permet de savoir, côté serveur
 * comme côté écran, qu'on est dans la version store.
 *
 * Deux règles propres à la version store :
 *   - aucun paiement ni lien de paiement (règle d'Apple et de Google : un
 *     abonnement numérique vendu dans l'app doit passer par leur paiement) ;
 *   - uniquement l'app clientes : l'espace coach et admin reste sur le site.
 */
export const MARQUEUR_COQUE = "TimeToMoveApp";

export function estCoque(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(MARQUEUR_COQUE);
}
