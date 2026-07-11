"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ttsColors } from "@/lib/tts-theme";

const ITEMS = [
  { href: "/tts", label: "Accueil", icon: "⌂", match: (p: string) => p === "/tts" },
  { href: "/tts/parcours", label: "Mon Parcours", icon: "🎯", match: (p: string) => p.startsWith("/tts/parcours") || p.startsWith("/tts/modules") },
  { href: "/tts/bibliotheque", label: "Bibliothèque", icon: "▦", match: (p: string) => p.startsWith("/tts/bibliotheque") },
  { href: "/tts/profil", label: "Profil", icon: "◯", match: (p: string) => p.startsWith("/tts/profil") },
];

export default function TtsBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: ttsColors.bg,
        borderTop: `1px solid ${ttsColors.cardBorder}`,
        display: "flex",
        padding: "10px 8px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
        zIndex: 50,
      }}
    >
      <div className="mx-auto flex" style={{ maxWidth: 480, width: "100%" }}>
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="font-body"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: active ? ttsColors.redBright : ttsColors.muted,
                fontSize: "10.5px",
                letterSpacing: "0.3px",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  ...(active
                    ? { background: "rgba(178,34,34,0.18)", width: 38, height: 26, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }
                    : {}),
                }}
              >
                {item.icon}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
