/**
 * Connecteur Claude — échange du code contre les jetons, et renouvellement.
 *
 * Le jeton d'accès dure 1 h, le renouvellement 60 jours : Claude reste
 * connecté sans redemander le mot de passe. À chaque appel, le rôle coach/admin
 * est relu (lib/mcp/acces.ts) : un compte qui perd son rôle perd l'accès.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  CORS,
  DUREE_ACCES_S,
  DUREE_RENOUV_S,
  empreinte,
  maintenant,
  pkceValide,
  signer,
  verifier,
} from "@/lib/mcp/jeton";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { estCoachOuAdmin } from "@/lib/mcp/acces";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function refus(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}

async function lireParametres(req: NextRequest): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? "")]));
  }
  const texte = await req.text();
  return Object.fromEntries(new URLSearchParams(texte));
}

async function jetons(userId: string, ci: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!estCoachOuAdmin(data?.user)) return null;

  const now = maintenant();
  return NextResponse.json(
    {
      access_token: signer({ t: "acces", u: userId, exp: now + DUREE_ACCES_S }),
      token_type: "Bearer",
      expires_in: DUREE_ACCES_S,
      refresh_token: signer({ t: "renouv", u: userId, ci, exp: now + DUREE_RENOUV_S }),
      scope: "lecture",
    },
    { headers: { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

export async function POST(req: NextRequest) {
  const p = await lireParametres(req);

  if (p.grant_type === "authorization_code") {
    const code = verifier(p.code, "code");
    if (!code) return refus("invalid_grant", "Code de connexion invalide ou expiré.");
    if (p.redirect_uri && p.redirect_uri !== code.r) return refus("invalid_grant", "Adresse de retour différente.");
    if (p.client_id && empreinte(p.client_id) !== code.ci) return refus("invalid_grant", "Client différent.");
    if (!pkceValide(p.code_verifier ?? "", code.cc)) return refus("invalid_grant", "Vérification PKCE échouée.");

    const reponse = await jetons(code.u, code.ci);
    return reponse ?? refus("access_denied", "Ce compte n'a pas accès au connecteur.", 403);
  }

  if (p.grant_type === "refresh_token") {
    const renouv = verifier(p.refresh_token, "renouv");
    if (!renouv) return refus("invalid_grant", "Connexion expirée, reconnecte-toi.");
    if (p.client_id && empreinte(p.client_id) !== renouv.ci) return refus("invalid_grant", "Client différent.");

    const reponse = await jetons(renouv.u, renouv.ci);
    return reponse ?? refus("access_denied", "Ce compte n'a pas accès au connecteur.", 403);
  }

  return refus("unsupported_grant_type", "Type de demande non pris en charge.");
}
