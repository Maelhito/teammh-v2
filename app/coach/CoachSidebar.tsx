"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const NAV = [
  { href: "/coach",            icon: "🏠", label: "Tableau de bord" },
  { href: "/coach/clientes",   icon: "👥", label: "Mes clientes" },
  { href: "/coach/exercices",  icon: "🏋️", label: "Banque d'exercices" },
  { href: "/coach/seances",    icon: "📋", label: "Séances" },
  { href: "/coach/programmes", icon: "📅", label: "Programmes" },
  { href: "/coach/profil",     icon: "👤", label: "Mon profil" },
];

export default function CoachSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  const isActive = (href: string) =>
    href === "/coach" ? pathname === "/coach" : pathname.startsWith(href);

  const sidebar = (
    <nav style={{
      width: 240, minHeight: "100vh", backgroundColor: "#111",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid #1e1e1e" }}>
        <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Time to Move
        </p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#F5F5F0", letterSpacing: "0.06em", margin: 0, fontFamily: "system-ui" }}>
          PORTAIL COACH
        </h1>
      </div>

      {/* Menu */}
      <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ href, icon, label }) => (
          <Link key={href} href={href} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 8, textDecoration: "none",
            backgroundColor: isActive(href) ? "rgba(178,34,34,0.15)" : "transparent",
            color: isActive(href) ? "#F5F5F0" : "#888",
            fontSize: 13, fontWeight: isActive(href) ? 700 : 400,
            letterSpacing: "0.02em", fontFamily: "system-ui",
            transition: "background 0.15s, color 0.15s",
            borderLeft: isActive(href) ? "2px solid #B22222" : "2px solid transparent",
          }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid #1e1e1e" }}>
        <button onClick={handleLogout} style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "none", backgroundColor: "transparent",
          color: "#555", fontSize: 13, cursor: "pointer",
          textAlign: "left", fontFamily: "system-ui",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: "none",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: "#111", padding: "14px 16px",
        alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #1e1e1e",
      }} className="coach-mobile-bar">
        <span style={{ color: "#F5F5F0", fontWeight: 700, fontSize: 14, fontFamily: "system-ui" }}>PORTAIL COACH</span>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#F5F5F0", fontSize: 22, cursor: "pointer" }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="coach-desktop-sidebar">{sidebar}</div>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, display: "flex" }}>
          <div onClick={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} />
          {sidebar}
        </div>
      )}

      <style>{`
        .coach-desktop-sidebar { display: flex; }
        .coach-mobile-bar { display: none !important; }
        @media (max-width: 768px) {
          .coach-desktop-sidebar { display: none !important; }
          .coach-mobile-bar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
