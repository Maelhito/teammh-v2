"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const NAV = [
  { href: "/admin",              icon: "🏠", label: "Tableau de bord" },
  { href: "/admin/clientes",     icon: "👥", label: "Clientes" },
  { href: "/admin/modules",      icon: "📚", label: "Modules" },
  { href: "/admin/calendrier",   icon: "📅", label: "Calendrier" },
  { href: "/admin/equipe",       icon: "🤝", label: "Équipe" },
  { href: "/admin/notifications",icon: "🔔", label: "Notifications" },
  { href: "/admin/acces",        icon: "🔑", label: "Accès & Rôles" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const sidebar = (
    <nav style={{
      width: 220, minHeight: "100vh", backgroundColor: "#0D0D0D",
      borderRight: "1px solid #1a1a1a",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 18px 20px", borderBottom: "1px solid #1a1a1a" }}>
        <p style={{ fontSize: 9, color: "#444", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 3px", fontFamily: "system-ui" }}>
          Time to Move
        </p>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 2px", fontFamily: "system-ui" }}>
          ESPACE ADMIN
        </h1>
        <span style={{ display: "inline-block", padding: "2px 8px", backgroundColor: "rgba(178,34,34,0.15)", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 4, fontSize: 10, color: "#B22222", fontFamily: "system-ui", fontWeight: 700, letterSpacing: "0.06em" }}>
          ADMIN
        </span>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 7, textDecoration: "none",
              backgroundColor: active ? "rgba(178,34,34,0.12)" : "transparent",
              color: active ? "#F5F5F0" : "#666",
              fontSize: 13, fontWeight: active ? 700 : 400,
              fontFamily: "system-ui", letterSpacing: "0.01em",
              borderLeft: active ? "2px solid #B22222" : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Links bottom */}
      <div style={{ padding: "10px 10px 12px", borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link href="/dashboard?preview=1" style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          borderRadius: 7, textDecoration: "none", color: "#555", fontSize: 12, fontFamily: "system-ui",
        }}>
          <span>👁</span> Vue cliente
        </Link>
        <Link href="/coach" style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          borderRadius: 7, textDecoration: "none", color: "#555", fontSize: 12, fontFamily: "system-ui",
        }}>
          <span>🏋️</span> Portail coach
        </Link>
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          borderRadius: 7, border: "none", backgroundColor: "transparent",
          color: "#444", fontSize: 12, cursor: "pointer", textAlign: "left",
          fontFamily: "system-ui", width: "100%",
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
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: "#0D0D0D", padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #1a1a1a",
      }} className="admin-mobile-bar">
        <span style={{ color: "#F5F5F0", fontWeight: 700, fontSize: 13, fontFamily: "system-ui", letterSpacing: "0.06em" }}>ADMIN</span>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#F5F5F0", fontSize: 20, cursor: "pointer" }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      <div className="admin-desktop-sidebar">{sidebar}</div>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, display: "flex" }}>
          <div>{sidebar}</div>
          <div onClick={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }} />
        </div>
      )}

      <style>{`
        .admin-desktop-sidebar { display: flex; }
        .admin-mobile-bar { display: none !important; }
        @media (max-width: 768px) {
          .admin-desktop-sidebar { display: none !important; }
          .admin-mobile-bar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
