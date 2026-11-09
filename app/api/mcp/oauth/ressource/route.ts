/**
 * Connecteur Claude — « qui protège ce connecteur ? » (RFC 9728).
 * Servi sur /.well-known/oauth-protected-resource (voir next.config.ts).
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
      resource: `${origine}/api/mcp`,
      authorization_servers: [origine],
      bearer_methods_supported: ["header"],
      scopes_supported: ["lecture"],
      resource_name: "Time To Move",
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } },
  );
}
