"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ttlColors, TTL_THEME_KEY, type TtlTheme } from "@/lib/ttl-theme";

const EVENEMENT = "ttl-theme-change";

function lireTheme(): TtlTheme {
  try {
    return localStorage.getItem(TTL_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function appliquer(theme: TtlTheme) {
  if (theme === "light") document.documentElement.setAttribute("data-ttl-theme", "light");
  else document.documentElement.removeAttribute("data-ttl-theme");
}

/**
 * Posé dans le layout /ttl : remet le mode choisi quand on arrive sur l'app par une
 * navigation interne (le script du layout ne tourne qu'au premier chargement), et
 * l'enlève en quittant /ttl pour ne pas déteindre sur le reste du site.
 */
export function TtlThemeSync() {
  useLayoutEffect(() => {
    appliquer(lireTheme());
    return () => document.documentElement.removeAttribute("data-ttl-theme");
  }, []);
  return null;
}

export function useTtlTheme() {
  const [theme, setTheme] = useState<TtlTheme>("dark");

  useEffect(() => {
    setTheme(lireTheme());
    const suivre = () => setTheme(lireTheme());
    window.addEventListener(EVENEMENT, suivre);
    return () => window.removeEventListener(EVENEMENT, suivre);
  }, []);

  function choisir(t: TtlTheme) {
    try { localStorage.setItem(TTL_THEME_KEY, t); } catch { /* navigation privée : le choix vaut pour la visite */ }
    appliquer(t);
    window.dispatchEvent(new Event(EVENEMENT));
  }

  return { theme, choisir };
}

/** Le choix « Jour / Nuit » du profil. */
export function TtlThemeToggle() {
  const { theme, choisir } = useTtlTheme();
  const options: { valeur: TtlTheme; label: string; icone: string }[] = [
    { valeur: "light", label: "Jour", icone: "☀️" },
    { valeur: "dark", label: "Nuit", icone: "🌙" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: ttlColors.bg, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const actif = theme === o.valeur;
        return (
          <button
            key={o.valeur}
            onClick={() => choisir(o.valeur)}
            aria-pressed={actif}
            className="font-body"
            style={{
              background: actif ? ttlColors.red : "transparent",
              color: actif ? "#fff" : ttlColors.muted,
              border: "none", borderRadius: 10, padding: "12px 4px",
              fontSize: 14, fontWeight: actif ? 700 : 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>{o.icone}</span> {o.label}
          </button>
        );
      })}
    </div>
  );
}
