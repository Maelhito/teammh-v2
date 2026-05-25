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
  { href: "/admin/equipe",       icon: "🤝", label: "Équipe & Accès" },
];

const COACH_NAV = [
  { href: "/admin/coach",            icon: "🏠", label: "Tableau de bord" },
  { href: "/admin/coach/clientes",   icon: "👥", label: "Mes clientes" },
  { href: "/admin/coach/exercices",  icon: "🏋️", label: "Banque d'exercices" },
  { href: "/admin/coach/seances",    icon: "📋", label: "Séances" },
  { href: "/admin/coach/programmes", icon: "📅", label: "Programmes" },
  { href: "/admin/coach/visios",     icon: "🎥", label: "Visios de groupe" },
  { href: "/admin/coach/profil",     icon: "👤", label: "Mon profil" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(() => {
    const isOnCoach = pathname.startsWith("/admin/coach");
    if (isOnCoach && typeof document !== "undefined") {
      document.cookie = "admin_mode=1; path=/; max-age=86400";
    }
    return isOnCoach;
  });

  async function handleLogout() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const isCoachActive = (href: string) =>
    href === "/admin/coach" ? pathname === "/admin/coach" : pathname.startsWith(href);

  const sidebar = (
    <nav style={{
      width: 230, minHeight: "100vh", backgroundColor: "#0D0D0D",
      borderRight: "1px solid #1a1a1a",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh", flexShrink: 0,
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 18px 20px", borderBottom: "1px solid #1a1a1a" }}>
        <p style={{ fontSize: 9, color: "#444", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 3px", fontFamily: "system-ui" }}>
          Time to Move
        </p>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 6px", fontFamily: "system-ui" }}>
          ESPACE ADMIN
        </h1>
        <span style={{ display: "inline-block", padding: "2px 8px", backgroundColor: "rgba(178,34,34,0.15)", border: "1px solid rgba(178,34,34,0.3)", borderRadius: 4, fontSize: 10, color: "#B22222", fontFamily: "system-ui", fontWeight: 700, letterSpacing: "0.06em" }}>
          ADMIN
        </span>
      </div>

      {/* Section Admin */}
      <div style={{ padding: "16px 10px 8px" }}>
        <p style={{ fontSize: 9, color: "#333", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px 10px", fontFamily: "system-ui" }}>
          Administration
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
      </div>

      {/* Séparateur + Section Coach */}
      <div style={{ margin: "8px 14px", height: 1, backgroundColor: "#1a1a1a" }} />

      <div style={{ padding: "8px 10px", flex: 1 }}>
        {/* Header section coach cliquable */}
        <button
          onClick={() => {
            const next = !coachOpen;
            setCoachOpen(next);
            if (next) {
              document.cookie = "admin_mode=1; path=/; max-age=86400";
            } else {
              document.cookie = "admin_mode=; path=/; max-age=0";
            }
          }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "8px 10px", borderRadius: 8, border: "none",
            background: coachOpen
              ? "linear-gradient(135deg, rgba(30,80,120,0.25), rgba(20,60,100,0.15))"
              : "rgba(255,255,255,0.03)",
            cursor: "pointer", textAlign: "left", fontFamily: "system-ui",
            marginBottom: coachOpen ? 6 : 0,
            outline: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg, #1E5080, #0e3a60)",
              fontSize: 14, flexShrink: 0,
            }}>🏋️</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: coachOpen ? "#fff" : "#4a8ab5", fontFamily: "system-ui", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Portail Coach
              </p>
              <p style={{ margin: 0, fontSize: 10, color: coachOpen ? "rgba(255,255,255,0.4)" : "#2a4a60", fontFamily: "system-ui" }}>
                Suivi & programmes
              </p>
            </div>
          </div>
          <span style={{ fontSize: 9, color: "#2a5a80" }}>{coachOpen ? "▲" : "▼"}</span>
        </button>

        {/* Items coach */}
        {coachOpen && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 1,
            borderLeft: "2px solid rgba(30,80,120,0.3)",
            marginLeft: 14, paddingLeft: 6,
          }}>
            {COACH_NAV.map(({ href, icon, label }) => {
              const active = isCoachActive(href);
              return (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 10px", borderRadius: 6, textDecoration: "none",
                  backgroundColor: active ? "rgba(30,80,120,0.25)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  fontFamily: "system-ui",
                  borderLeft: active ? "2px solid #2d7ab5" : "2px solid transparent",
                  transition: "all 0.12s",
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bas : vue cliente + déconnexion */}
      <div style={{ padding: "8px 10px 14px", borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 2 }}>
        <Link href="/dashboard?preview=1" style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          borderRadius: 7, textDecoration: "none", color: "#444", fontSize: 12, fontFamily: "system-ui",
        }}>
          <span>👁</span> Vue cliente
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
