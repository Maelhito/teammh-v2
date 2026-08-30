"use client";

import { useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";
import { TTL_RECETTE_CATEGORIE_LABELS } from "@/lib/ttl";
import type { TtlRecette, TtlRecetteCategorie } from "@/lib/ttl";
import { TtlFilterChip } from "@/components/TtlUI";

interface Props {
  recettes: TtlRecette[];
}

const CATEGORIE_ORDER: TtlRecetteCategorie[] = ["petit_dej", "dejeuner", "diner", "collation"];

export default function TtlAlimentation({ recettes }: Props) {
  const [categorieFilter, setCategorieFilter] = useState<TtlRecetteCategorie | "toutes">("toutes");
  const [openRecette, setOpenRecette] = useState<TtlRecette | null>(null);

  const filteredRecettes = categorieFilter === "toutes" ? recettes : recettes.filter((r) => r.categorie === categorieFilter);

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        <TtlFilterChip active={categorieFilter === "toutes"} onClick={() => setCategorieFilter("toutes")}>Toutes</TtlFilterChip>
        {CATEGORIE_ORDER.map((c) => (
          <TtlFilterChip key={c} active={categorieFilter === c} onClick={() => setCategorieFilter(c)}>{TTL_RECETTE_CATEGORIE_LABELS[c]}</TtlFilterChip>
        ))}
      </div>

      {filteredRecettes.map((r) => (
        <button
          key={r.id}
          onClick={() => setOpenRecette(r)}
          style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, cursor: "pointer" }}
        >
          <div style={{
            height: 110, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
            background: r.photo_url ? undefined : "linear-gradient(135deg,#3a3a1f,#1f1f12)",
            backgroundImage: r.photo_url ? `url(${r.photo_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
          }}>
            {!r.photo_url && "🥗"}
            {r.duree_minutes && (
              <span className="font-body" style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 10 }}>
                {r.duree_minutes} min
              </span>
            )}
          </div>
          <div style={{ padding: "12px 14px" }}>
            {r.categorie && (
              <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
                {TTL_RECETTE_CATEGORIE_LABELS[r.categorie]}
              </p>
            )}
            <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "4px 0 0" }}>{r.titre}</p>
          </div>
        </button>
      ))}

      {filteredRecettes.length === 0 && (
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>
          {recettes.length === 0 ? "Aucune recette pour l'instant." : "Aucune recette dans cette catégorie."}
        </p>
      )}

      {openRecette && (
        <div
          onClick={() => setOpenRecette(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
          >
            {openRecette.photo_url && (
              <div style={{ width: "100%", height: 180, backgroundImage: `url(${openRecette.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div>
                  {openRecette.categorie && (
                    <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>
                      {TTL_RECETTE_CATEGORIE_LABELS[openRecette.categorie]}{openRecette.duree_minutes ? ` · ${openRecette.duree_minutes} min` : ""}
                    </p>
                  )}
                  <p className="font-body" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>{openRecette.titre}</p>
                </div>
                <button onClick={() => setOpenRecette(null)} style={{ background: "none", border: "none", color: ttlColors.muted, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>

              {openRecette.macros && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {Object.entries(openRecette.macros).map(([key, value]) => (
                    <span key={key} className="font-body" style={{ fontSize: "0.7rem", color: "#F5F5F0", backgroundColor: ttlColors.bg, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 20, padding: "4px 10px" }}>
                      {value}{key === "calories" ? " kcal" : key === "proteines" ? " g prot." : key === "glucides" ? " g gluc." : key === "lipides" ? " g lip." : ` ${key}`}
                    </span>
                  ))}
                </div>
              )}

              {openRecette.ingredients && (
                <>
                  <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttlColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>INGRÉDIENTS</p>
                  <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 14px" }}>
                    {openRecette.ingredients}
                  </p>
                </>
              )}

              {openRecette.texte && (
                <>
                  <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttlColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>PRÉPARATION</p>
                  <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                    {openRecette.texte}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
