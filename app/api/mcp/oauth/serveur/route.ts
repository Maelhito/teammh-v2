/**
 * Connecteur Claude — description du serveur de connexion (RFC 8414).
 * Servi sur /.well-known/oauth-authorization-server (voir next.config.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { CORS, origineDe } from "@/lib/mcp/jeton";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET(req: NextRequest) {
  const origine = origineDe(req);
  return NextResponse.json(
    {
      issuer: origine,
      authorization_endpoint: `${origine}/connecteur-claude`,
      token_endpoint: `${origine}/api/mcp/oauth/jeton`,
      registration_endpoint: `${origine}/api/mcp/oauth/inscription`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["lecture"],
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } },
  );
}
