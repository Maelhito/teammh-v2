import type { Metadata } from "next";

/**
 * Identité propre à Time To Live.
 *
 * Même site, même code, mais les pages /ttl déclarent leur propre manifeste et
 * leur propre icône : une cliente TTL qui installe l'app obtient "Time To Live"
 * et le logo rouge sur son écran d'accueil, là où une cliente TTM obtient
 * "Time to Move". Sans ça, les deux offres partageaient la même icône et le
 * même nom, impossible de les distinguer sur un téléphone.
 */
export const metadata: Metadata = {
  title: "Time To Live",
  description: "Sport, nutrition et motivation, tous les jours",
  manifest: "/manifest-ttl.json",
  icons: { apple: "/icons/ttl-apple-touch.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Time To Live",
  },
};

export default function TtlLayout({ children }: { children: React.ReactNode }) {
  return children;
}
