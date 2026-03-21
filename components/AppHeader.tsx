"use client";

import Image from "next/image";
import Link from "next/link";

interface AppHeaderProps {
  back?: boolean;
  backHref?: string;
}

export default function AppHeader({ back = false, backHref = "/dashboard" }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ backgroundColor: "#B22222", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
    >
      <div className="mx-auto flex items-center justify-between px-4" style={{ maxWidth: 480, height: 56 }}>

        {/* Gauche */}
        {back ? (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 font-body font-semibold text-sm"
            style={{ color: "#F5F5F0" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour
          </Link>
        ) : (
          <div style={{ width: 60 }} />
        )}

        {/* Logo centré */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          backgroundColor: "#0D0D0D",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.25), 0 0 18px rgba(255,255,255,0.15)",
          marginTop: 55,
          flexShrink: 0,
        }}>
          <Image src="/logo.jpeg" alt="Time To Move" width={72} height={72} style={{ objectFit: "cover" }} priority />
        </div>

        <div style={{ width: 60 }} />
      </div>
    </header>
  );
}
