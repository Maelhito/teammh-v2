/**
 * Connecteur Claude — enregistrement automatique du client (RFC 7591).
 *
 * Claude s'enregistre tout seul avant la première connexion. On ne stocke
 * rien : l'identifiant renvoyé est un paquet signé qui contient ses adresses de
 * retour. Seules les adresses de Claude (ou de l'ordinateur même) sont admises.
 */
import { NextRequest, NextResponse } from "next/server";
import { CORS, redirectionAutorisee, signer } from "@/lib/mcp/jeton";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS });
  }

  const redirections = Array.isArray(corps.redirect_uris)
    ? corps.redirect_uris.filter((r): r is string => typeof r === "string")
    : [];
  if (!redirections.length || redirections.length > 10 || !redirections.every(redirectionAutorisee)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "Adresse de retour non autorisée pour ce connecteur." },
      { status: 400, headers: CORS },
    );
  }

  const nom = typeof corps.client_name === "string" ? corps.client_name.slice(0, 80) : undefined;
  const clientId = signer({ t: "client", r: redirections, ...(nom ? { n: nom } : {}) });

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: nom,
      redirect_uris: redirections,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: CORS },
  );
}
