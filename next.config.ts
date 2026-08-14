import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les erreurs TypeScript FONT échouer le build, volontairement.
  // Avec `ignoreBuildErrors: true`, du code cassé partait en prod sans alerte :
  // c'est le garde-fou qui protège main. Le projet est à 0 erreur — le garder ainsi.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
