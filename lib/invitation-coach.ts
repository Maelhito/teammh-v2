import { createHmac, timingSafeEqual } from "crypto";

/**
 * Invitation coach : un code signé, à durée limitée, collé dans le lien
 * d'inscription coach (`/inscription?role=coach&code=…`).
 *
 * Avant, `/inscription?role=coach` suffisait : n'importe qui connaissant
 * l'adresse pouvait se créer un compte coach. Le code est fabriqué uniquement
 * côté serveur, sur l'écran admin, et vérifié à l'inscription. Il ne demande
 * aucun réglage : il est signé avec la clé de service déjà présente.
 */

const DUREE_JOURS = 7;

function signer(expiration: string): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`invitation-coach:${expiration}`).digest("hex").slice(0, 32);
}

/** Code d'invitation valable `DUREE_JOURS` jours. Null si la clé de service manque. */
export function creerCodeCoach(): string | null {
  const expiration = (Date.now() + DUREE_JOURS * 86_400_000).toString(36);
  const signature = signer(expiration);
  return signature ? `${expiration}.${signature}` : null;
}

export function codeCoachValide(code: unknown): boolean {
  if (typeof code !== "string") return false;
  const [expiration, signature] = code.split(".");
  if (!expiration || !signature) return false;

  const attendue = signer(expiration);
  if (!attendue || attendue.length !== signature.length) return false;
  if (!timingSafeEqual(Buffer.from(attendue), Buffer.from(signature))) return false;

  const fin = parseInt(expiration, 36);
  return Number.isFinite(fin) && Date.now() < fin;
}

export const DUREE_INVITATION_COACH_JOURS = DUREE_JOURS;
