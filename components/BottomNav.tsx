"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const active = "#B22222";
  const inactive = "#444";
  const isModules = pathname.startsWith("/dashboard") || pathname.startsWith("/modules");
  const isProfil = pathname.startsWith("/profil");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: "#111111",
        borderTop: "1px solid #1a1a1a",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto flex" style={{ maxWidth: 480 }}>

        <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1 py-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isModules ? active : inactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span className="font-body font-semibold" style={{ fontSize: "0.62rem", color: isModules ? active : inactive, letterSpacing: "0.06em" }}>
            MES PLANS
          </span>
        </Link>

        <Link href="/profil" className="flex-1 flex flex-col items-center justify-center gap-1 py-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isProfil ? active : inactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span className="font-body font-semibold" style={{ fontSize: "0.62rem", color: isProfil ? active : inactive, letterSpacing: "0.06em" }}>
            PROFIL
          </span>
        </Link>

      </div>
    </nav>
  );
}
