"use client";

import ChangerMotDePasse from "@/components/ChangerMotDePasse";
import { TtlThemeToggle, useTtlTheme } from "@/components/TtlTheme";
import { ttlColors } from "@/lib/ttl-theme";

export function TtlApparence() {
  return (
    <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 18px", marginTop: 12 }}>
      <p className="font-body" style={{ margin: "0 0 4px", color: ttlColors.text, fontSize: 14, fontWeight: 700 }}>🎨 Affichage</p>
      <p className="font-body" style={{ margin: "0 0 12px", color: ttlColors.muted, fontSize: 12 }}>Fond blanc le jour, fond noir la nuit : choisis ce qui te repose les yeux.</p>
      <TtlThemeToggle />
    </div>
  );
}

/** Le formulaire de mot de passe, aux couleurs du mode choisi. */
export function TtlChangerMotDePasse() {
  const { theme } = useTtlTheme();
  return <ChangerMotDePasse theme={theme === "light" ? "clair" : "sombre"} />;
}
