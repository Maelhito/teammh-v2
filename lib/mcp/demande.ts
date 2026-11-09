/**
 * Connecteur Claude — vérification d'une demande de connexion
 * (paramètres reçus par la page /connecteur-claude et par son formulaire).
 */
import { redirectionAutorisee, verifier } from "./jeton";

export interface DemandeConnexion {
  clientId: string;
  nomClient: string | null;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
}

export function lireDemande(
  p: Record<string, string | string[] | undefined>,
): { ok: true; demande: DemandeConnexion } | { ok: false; raison: string } {
  const un = (k: string) => {
    const v = p[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  const client = verifier(un("client_id"), "client");
  if (!client) return { ok: false, raison: "Ce lien de connexion n'est pas valide. Relance la connexion depuis Claude." };

  const redirectUri = un("redirect_uri") ?? (client.r.length === 1 ? client.r[0] : "");
  if (!redirectUri || !client.r.includes(redirectUri) || !redirectionAutorisee(redirectUri)) {
    return { ok: false, raison: "Adresse de retour non autorisée. Relance la connexion depuis Claude." };
  }
  if ((un("response_type") ?? "code") !== "code") return { ok: false, raison: "Type de demande non pris en charge." };

  const codeChallenge = un("code_challenge") ?? "";
  if (!codeChallenge || (un("code_challenge_method") ?? "S256") !== "S256") {
    return { ok: false, raison: "Demande incomplète (PKCE manquant). Relance la connexion depuis Claude." };
  }

  return {
    ok: true,
    demande: {
      clientId: un("client_id")!,
      nomClient: client.n ?? null,
      redirectUri,
      state: un("state") ?? null,
      codeChallenge,
    },
  };
}
