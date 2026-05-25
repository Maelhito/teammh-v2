"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";

const DARK: Record<string, string> = {
  "--admin-bg":             "#0D0D0D",
  "--admin-sidebar":        "#0D0D0D",
  "--admin-sidebar-border": "#1a1a1a",
  "--admin-card":           "#1a1a1a",
  "--admin-card2":          "#111111",
  "--admin-text":           "#F5F5F0",
  "--admin-text-muted":     "#555",
  "--admin-text-dim":       "#333",
  "--admin-border":         "#222",
  "--admin-section-label":  "#333",
  "--admin-nav-inactive":   "#666",
  "--admin-separator":      "#1a1a1a",
  "--admin-bottom-action":  "#444",
  "--admin-input-bg":       "#1a1a1a",
  "--admin-cal-cell":       "#111111",
  "--admin-cal-border":     "#2a2a2a",
  "--admin-cal-text":       "#374151",
  "--admin-cal-today-bg":   "#1a0808",
};

const LIGHT: Record<string, string> = {
  "--admin-bg":             "#F4F1EC",
  "--admin-sidebar":        "#FFFFFF",
  "--admin-sidebar-border": "#E8E5E0",
  "--admin-card":           "#FFFFFF",
  "--admin-card2":          "#F8F7F4",
  "--admin-text":           "#1a1a1a",
  "--admin-text-muted":     "#666",
  "--admin-text-dim":       "#aaa",
  "--admin-border":         "#E5E7EB",
  "--admin-section-label":  "#aaa",
  "--admin-nav-inactive":   "#888",
  "--admin-separator":      "#E8E5E0",
  "--admin-bottom-action":  "#888",
  "--admin-input-bg":       "#F8F7F4",
  "--admin-cal-cell":       "#FFFFFF",
  "--admin-cal-border":     "#e5e7eb",
  "--admin-cal-text":       "#374151",
  "--admin-cal-today-bg":   "#FFF5F5",
};

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(ThemeCtx);
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("admin-theme") as Theme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    const vars = theme === "dark" ? DARK : LIGHT;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  function toggle() {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("admin-theme", next);
      return next;
    });
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
