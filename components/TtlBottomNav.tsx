"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ttlColors } from "@/lib/ttl-theme";

const ITEMS = [
  { href: "/ttl", label: "Accueil", icon: "⌂", match: (p: string) => p === "/ttl" || p.startsWith("/ttl/modules") },
  { href: "/ttl/sport", label: "Sport", icon: "🏋️", match: (p: string) => p.startsWith("/ttl/sport") },
  { href: "/ttl/alimentation", label: "Alimentation", icon: "🥗", match: (p: string) => p.startsWith("/ttl/alimentation") },
  { href: "/ttl/profil", label: "Profil", icon: "◯", match: (p: string) => p.startsWith("/ttl/profil") },
];

export default function TtlBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: ttlColors.bg,
        borderTop: `1px solid ${ttlColors.cardBorder}`,
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
                color: active ? ttlColors.redBright : ttlColors.muted,
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
