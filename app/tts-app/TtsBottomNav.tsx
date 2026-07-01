"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/tts-app", label: "Accueil", icon: "⌂", exact: true },
  { href: "/tts-app/parcours", label: "Mon Parcours", icon: "🎯", exact: false },
  { href: "/tts-app/bibliotheque", label: "Bibliothèque", icon: "▦", exact: false },
  { href: "/tts-app/profil", label: "Profil", icon: "◯", exact: false },
];

export default function TtsBottomNav() {
  const pathname = usePathname();
  const active = "#E63946";
  const inactive = "#8A8078";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ backgroundColor: "#0D0D0D", borderTop: "1px solid #2A2020", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex" style={{ maxWidth: 480 }}>
        {ITEMS.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 py-3">
              <span style={{ fontSize: 19, color: isActive ? active : inactive }}>{icon}</span>
              <span className="font-body font-semibold" style={{ fontSize: "0.62rem", color: isActive ? active : inactive, letterSpacing: "0.03em" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
