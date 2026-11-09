import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les erreurs TypeScript FONT échouer le build, volontairement.
  // Avec `ignoreBuildErrors: true`, du code cassé partait en prod sans alerte :
  // c'est le garde-fou qui protège main. Le projet est à 0 erreur — le garder ainsi.
  typescript: { ignoreBuildErrors: false },

  // Connecteur Claude (MCP) : Claude cherche ces deux descriptions à des
  // adresses imposées par la norme OAuth. Elles sont servies par lib/mcp.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/mcp/oauth/ressource" },
      { source: "/.well-known/oauth-protected-resource/:chemin*", destination: "/api/mcp/oauth/ressource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/mcp/oauth/serveur" },
      { source: "/.well-known/oauth-authorization-server/:chemin*", destination: "/api/mcp/oauth/serveur" },
    ];
  },
};

export default nextConfig;
