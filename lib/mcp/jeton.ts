/**
 * Connecteur Claude (MCP) — jetons de connexion.
 *
 * Claude se connecte à l'app comme n'importe quel client OAuth : le coach
 * s'identifie avec son compte TTM, accepte, et Claude reçoit un jeton qui ne
 * permet QUE de lire (voir lib/mcp/outils.ts : aucun outil n'écrit).
 *
 * Tout est « sans état » : chaque jeton est un petit paquet signé (HMAC) qui
 * porte lui-même ce qu'il autorise et sa date d'expiration. Pas de table à
 * créer, rien à nettoyer. La clé de signature est dérivée de la clé serveur
 * Supabase (jamais exposée au navigateur) : pas de nouvelle variable à poser.
 *
 * Ce fichier n'importe rien du projet, exprès : on peut le charger tel quel
 * dans un script Node pour tester.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type Jeton =
  /** Enregistrement d'un client (Claude) : ses adresses de retour autorisées. */
  | { t: "client"; r: string[]; n?: string }
  /** Code à usage court, échangé contre les jetons d'accès. */
  | { t: "code"; u: string; r: string; cc: string; ci: string; exp: number }
  /** Jeton d'accès, présenté à chaque appel du connecteur. */
  | { t: "acces"; u: string; exp: number }
  /** Jeton de renouvellement, pour ne pas redemander la connexion. */
  | { t: "renouv"; u: string; ci: string; exp: number };

export const DUREE_CODE_S = 5 * 60;
export const DUREE_ACCES_S = 60 * 60;
export const DUREE_RENOUV_S = 60 * 24 * 60 * 60;

function cle(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createHmac("sha256", secret).update("ttm-connecteur-claude-v1").digest();
}

function b64(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signer(contenu: Jeton): string {
  const corps = b64(JSON.stringify(contenu));
  const sig = b64(createHmac("sha256", cle()).update(corps).digest());
  return `v1.${corps}.${sig}`;
}

/** Vérifie la signature, le type et l'expiration. Renvoie null sinon. */
export function verifier<T extends Jeton["t"]>(
  jeton: string | null | undefined,
  type: T,
): Extract<Jeton, { t: T }> | null {
  if (!jeton) return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 3 || morceaux[0] !== "v1") return null;
  const [, corps, sig] = morceaux;

  const attendu = createHmac("sha256", cle()).update(corps).digest();
  const recu = Buffer.from(sig, "base64url");
  if (recu.length !== attendu.length || !timingSafeEqual(recu, attendu)) return null;

  let contenu: Jeton;
  try {
    contenu = JSON.parse(Buffer.from(corps, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (contenu.t !== type) return null;
  if ("exp" in contenu && contenu.exp < Math.floor(Date.now() / 1000)) return null;
  return contenu as Extract<Jeton, { t: T }>;
}

export function maintenant(): number {
  return Math.floor(Date.now() / 1000);
}

/** Empreinte courte d'un client_id, pour lier code et renouvellement au même client. */
export function empreinte(texte: string): string {
  return createHash("sha256").update(texte).digest("base64url").slice(0, 22);
}

/** PKCE (S256) : le vérificateur haché doit redonner le défi envoyé au départ. */
export function pkceValide(verificateur: string, defi: string): boolean {
  if (!verificateur || !defi) return false;
  const calcule = createHash("sha256").update(verificateur).digest("base64url");
  return calcule.length === defi.length && timingSafeEqual(Buffer.from(calcule), Buffer.from(defi));
}

/**
 * Adresses de retour acceptées : l'app Claude (claude.ai / claude.com) et
 * les outils qui tournent sur l'ordinateur même (Claude Code, inspecteur MCP).
 * Toute autre adresse est refusée : un code de connexion ne peut donc jamais
 * partir ailleurs que chez Claude ou sur la machine de la personne.
 */
export function redirectionAutorisee(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  if (
    u.protocol === "https:" &&
    ["claude.ai", "claude.com", "www.claude.ai", "www.claude.com"].includes(u.hostname) &&
    u.pathname === "/api/mcp/auth_callback"
  ) {
    return true;
  }
  if (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) return true;
  return false;
}

/** Adresse publique du site, telle que l'a appelée Claude (prod ou local). */
export function origineDe(req: Request): string {
  const h = req.headers;
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  if (hote) {
    const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") || hote.startsWith("127.") ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${hote.split(",")[0].trim()}`;
  }
  return new URL(req.url).origin;
}

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
