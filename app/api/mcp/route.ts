/**
 * Connecteur Claude (MCP) — le point d'entrée que Claude appelle.
 *
 * Protocole MCP « Streamable HTTP » en mode simple : chaque requête POST porte
 * un message JSON-RPC, la réponse est du JSON. Pas de session à garder.
 * Sans jeton valide → 401 avec l'adresse des métadonnées OAuth : c'est ce qui
 * déclenche, côté Claude, la page de connexion au compte TTM.
 */
import { NextRequest, NextResponse } from "next/server";
import { CORS, origineDe } from "@/lib/mcp/jeton";
import { utilisateurDuJeton } from "@/lib/mcp/acces";
import { INSTRUCTIONS, OUTILS, appelerOutil } from "@/lib/mcp/outils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

type Message = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function repondre(id: Message["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function erreur(id: Message["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  // Pas de flux SSE : Claude se contente des réponses aux POST.
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export async function POST(req: NextRequest) {
  const user = await utilisateurDuJeton(req);
  if (!user) {
    const origine = origineDe(req);
    return NextResponse.json(
      erreur(null, -32001, "Connexion au compte Time To Move requise."),
      {
        status: 401,
        headers: {
          ...CORS,
          "WWW-Authenticate": `Bearer resource_metadata="${origine}/.well-known/oauth-protected-resource", error="invalid_token"`,
        },
      },
    );
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json(erreur(null, -32700, "JSON illisible"), { status: 400, headers: CORS });
  }

  const messages: Message[] = Array.isArray(corps) ? corps : [corps as Message];
  const reponses: unknown[] = [];

  for (const msg of messages) {
    // Une notification (sans id) n'attend pas de réponse.
    if (msg?.id === undefined || msg.id === null) continue;
    const params = msg.params ?? {};

    switch (msg.method) {
      case "initialize": {
        const demandee = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
        reponses.push(
          repondre(msg.id, {
            protocolVersion: VERSIONS.includes(demandee) ? demandee : "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "time-to-move", title: "Time To Move", version: "1.0.0" },
            instructions: INSTRUCTIONS,
          }),
        );
        break;
      }
      case "ping":
        reponses.push(repondre(msg.id, {}));
        break;
      case "tools/list":
        reponses.push(
          repondre(msg.id, {
            tools: OUTILS.map(({ name, title, description, inputSchema, annotations }) => ({
              name,
              title,
              description,
              inputSchema,
              annotations,
            })),
          }),
        );
        break;
      case "tools/call": {
        const nom = typeof params.name === "string" ? params.name : "";
        const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
        reponses.push(repondre(msg.id, await appelerOutil(user, nom, args)));
        break;
      }
      case "resources/list":
        reponses.push(repondre(msg.id, { resources: [] }));
        break;
      case "prompts/list":
        reponses.push(repondre(msg.id, { prompts: [] }));
        break;
      default:
        reponses.push(erreur(msg.id, -32601, `Méthode inconnue : ${msg.method}`));
    }
  }

  if (!reponses.length) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(Array.isArray(corps) ? reponses : reponses[0], { headers: CORS });
}
