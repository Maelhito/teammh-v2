"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";
import { categorieAvecGout, TTL_RECETTE_CATEGORIE_LABELS, TTL_RECETTE_GOUT_LABELS } from "@/lib/ttl";
import type { TtlPlanAlimentaire, TtlRecette, TtlRecetteCategorie, TtlRecetteGout } from "@/lib/ttl";
import { TtlFilterChip } from "@/components/TtlUI";

interface Props {
  plans: TtlPlanAlimentaire[];
  recettes: TtlRecette[];
}

const ONGLETS = ["Plans alimentaires", "Recettes"] as const;
const CATEGORIE_ORDER: TtlRecetteCategorie[] = ["repas", "petit_dej", "collation"];

function formatKcal(calories: number) {
  return `${calories.toLocaleString("fr-FR")} kcal`;
}

export default function TtlAlimentation({ plans, recettes }: Props) {
  const [onglet, setOnglet] = useState(0);
  const [hauteur, setHauteur] = useState<number | undefined>(undefined);
  const sliderRef = useRef<HTMLDivElement>(null);
  const panneauxRef = useRef<(HTMLDivElement | null)[]>([]);

  // Le slider prend la hauteur du panneau affiché, pour ne pas laisser de vide sous le plus court.
  useEffect(() => {
    const panneau = panneauxRef.current[onglet];
    if (!panneau) return;
    const observer = new ResizeObserver(() => setHauteur(panneau.offsetHeight));
    observer.observe(panneau);
    return () => observer.disconnect();
  }, [onglet]);

  function allerA(index: number) {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: index * slider.clientWidth, behavior: "smooth" });
    setOnglet(index);
  }

  function onScroll() {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    if (index !== onglet) setOnglet(index);
  }

  return (
    <div style={{ padding: "20px 0 100px" }}>
      <div style={{ margin: "0 20px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 14, padding: 4 }}>
        {ONGLETS.map((label, i) => (
          <button
            key={label}
            onClick={() => allerA(i)}
            className="font-body"
            style={{
              background: onglet === i ? ttlColors.red : "transparent",
              color: onglet === i ? "#fff" : ttlColors.muted,
              border: "none", borderRadius: 10, padding: "11px 8px",
              fontSize: 14, fontWeight: onglet === i ? 700 : 500, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={sliderRef}
        onScroll={onScroll}
        className="ttl-alim-slider"
        style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", height: hauteur }}
      >
        <div ref={(el) => { panneauxRef.current[0] = el; }} style={panneauStyle}>
          <PanneauPlans plans={plans} />
        </div>
        <div ref={(el) => { panneauxRef.current[1] = el; }} style={panneauStyle}>
          <PanneauRecettes recettes={recettes} />
        </div>
      </div>
      <style>{`.ttl-alim-slider::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

const panneauStyle: React.CSSProperties = {
  flex: "0 0 100%", width: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", padding: "0 20px", boxSizing: "border-box",
};

/* ------------------------------------------------------------------ */
/* Plans alimentaires                                                  */
/* ------------------------------------------------------------------ */

function PanneauPlans({ plans }: { plans: TtlPlanAlimentaire[] }) {
  const [choisi, setChoisi] = useState<TtlPlanAlimentaire | null>(plans[0] ?? null);
  const [pageOuverte, setPageOuverte] = useState<number | null>(null);

  if (plans.length === 0) {
    return <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Les plans alimentaires arrivent bientôt.</p>;
  }

  return (
    <div>
      <p className="font-body" style={{ color: ttlColors.offWhite, fontSize: 14, lineHeight: 1.5, margin: "0 0 14px" }}>
        <strong>1.</strong> Choisis ton apport calorique.<br />
        <strong>2.</strong> Feuillette ton plan, touche une page pour l&apos;agrandir.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 5)}, 1fr)`, gap: 6, marginBottom: 18 }}>
        {plans.map((p) => {
          const actif = choisi?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setChoisi(p)}
              className="font-body"
              style={{
                background: actif ? ttlColors.red : ttlColors.card,
                border: `1px solid ${actif ? ttlColors.red : ttlColors.cardBorder}`,
                borderRadius: 12, padding: "10px 2px", cursor: "pointer", color: actif ? "#fff" : ttlColors.offWhite,
              }}
            >
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.calories.toLocaleString("fr-FR")}</span>
              <span style={{ display: "block", fontSize: 10, color: actif ? "rgba(255,255,255,0.85)" : ttlColors.muted }}>kcal</span>
            </button>
          );
        })}
      </div>

      {choisi && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p className="font-body" style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Plan {formatKcal(choisi.calories)}</p>
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0 }}>{choisi.pages.length} page{choisi.pages.length > 1 ? "s" : ""}</p>
          </div>

          <div
            key={choisi.id}
            className="ttl-alim-slider"
            style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", scrollbarWidth: "none", margin: "0 -20px", padding: "0 20px 4px", scrollPaddingLeft: 20 }}
          >
            {choisi.pages.map((url, i) => (
              <button
                key={url}
                onClick={() => setPageOuverte(i)}
                style={{ flex: "0 0 62%", scrollSnapAlign: "start", padding: 0, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 12, overflow: "hidden", background: "#fff", cursor: "zoom-in", position: "relative" }}
              >
                <img src={url} alt={`Page ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} style={{ display: "block", width: "100%", height: "auto" }} />
                <span className="font-body" style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 10 }}>
                  {i + 1}/{choisi.pages.length}
                </span>
              </button>
            ))}
          </div>

          <a
            href={choisi.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body"
            style={{ display: "block", textAlign: "center", marginTop: 16, padding: "12px", borderRadius: 12, border: `1px solid ${ttlColors.cardBorder}`, color: ttlColors.offWhite, fontSize: 13, textDecoration: "none" }}
          >
            ⬇ Télécharger le PDF
          </a>
        </>
      )}

      {choisi && pageOuverte !== null && (
        <LecteurPages plan={choisi} depart={pageOuverte} onClose={() => setPageOuverte(null)} />
      )}
    </div>
  );
}

function LecteurPages({ plan, depart, onClose }: { plan: TtlPlanAlimentaire; depart: number; onClose: () => void }) {
  const [page, setPage] = useState(depart);
  const [zoom, setZoom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollLeft = depart * ref.current.clientWidth;
  }, [depart]);

  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = precedent; };
  }, []);

  function onScroll() {
    const el = ref.current;
    if (!el || zoom) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }

  function changerPage(delta: number) {
    const el = ref.current;
    const cible = page + delta;
    if (!el || cible < 0 || cible >= plan.pages.length) return;
    setZoom(false);
    el.scrollTo({ left: cible * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <div>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>Plan {formatKcal(plan.calories)}</p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0 }}>Page {page + 1} / {plan.pages.length}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        className="ttl-alim-slider"
        style={{ flex: 1, display: "flex", overflowX: zoom ? "hidden" : "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", minHeight: 0 }}
      >
        {plan.pages.map((url, i) => (
          <div key={url} style={{ flex: "0 0 100%", scrollSnapAlign: "center", overflow: zoom && i === page ? "auto" : "hidden", display: "flex", alignItems: zoom && i === page ? "flex-start" : "center", justifyContent: zoom && i === page ? "flex-start" : "center" }}>
            <img
              src={url}
              alt={`Page ${i + 1}`}
              onClick={() => setZoom((z) => !z)}
              loading={Math.abs(i - depart) <= 1 ? "eager" : "lazy"}
              style={zoom && i === page
                ? { width: "240%", maxWidth: "none", height: "auto", cursor: "zoom-out" }
                : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", gap: 10 }}>
        <button onClick={() => changerPage(-1)} disabled={page === 0} style={{ ...flecheStyle, opacity: page === 0 ? 0.3 : 1 }}>‹</button>
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0, textAlign: "center" }}>
          {zoom ? "Touche la page pour dézoomer" : "Glisse pour tourner · touche pour zoomer"}
        </p>
        <button onClick={() => changerPage(1)} disabled={page === plan.pages.length - 1} style={{ ...flecheStyle, opacity: page === plan.pages.length - 1 ? 0.3 : 1 }}>›</button>
      </div>
    </div>
  );
}

const flecheStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 24, cursor: "pointer", flexShrink: 0,
};

/* ------------------------------------------------------------------ */
/* Recettes                                                            */
/* ------------------------------------------------------------------ */

function PanneauRecettes({ recettes }: { recettes: TtlRecette[] }) {
  const [categorie, setCategorie] = useState<TtlRecetteCategorie>("repas");
  const [gout, setGout] = useState<TtlRecetteGout | "tout">("tout");
  const [openRecette, setOpenRecette] = useState<TtlRecette | null>(null);

  const avecGout = categorieAvecGout(categorie);
  const filtrees = recettes.filter((r) => r.categorie === categorie && (!avecGout || gout === "tout" || r.gout === gout));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: avecGout ? 10 : 16 }}>
        {CATEGORIE_ORDER.map((c) => {
          const actif = categorie === c;
          return (
            <button
              key={c}
              onClick={() => { setCategorie(c); setGout("tout"); }}
              className="font-body"
              style={{
                background: actif ? ttlColors.red : ttlColors.card,
                border: `1px solid ${actif ? ttlColors.red : ttlColors.cardBorder}`,
                color: actif ? "#fff" : ttlColors.offWhite,
                borderRadius: 12, padding: "11px 4px", fontSize: 13, fontWeight: actif ? 700 : 500, cursor: "pointer",
              }}
            >
              {TTL_RECETTE_CATEGORIE_LABELS[c]}
            </button>
          );
        })}
      </div>

      {avecGout && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TtlFilterChip active={gout === "tout"} onClick={() => setGout("tout")}>Tout</TtlFilterChip>
          {(Object.keys(TTL_RECETTE_GOUT_LABELS) as TtlRecetteGout[]).map((g) => (
            <TtlFilterChip key={g} active={gout === g} onClick={() => setGout(g)}>{TTL_RECETTE_GOUT_LABELS[g]}</TtlFilterChip>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtrees.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenRecette(r)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
          >
            <div style={{
              aspectRatio: "4 / 3", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
              background: r.photo_url ? undefined : "linear-gradient(135deg,#3a3a1f,#1f1f12)",
              backgroundImage: r.photo_url ? `url(${r.photo_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
            }}>
              {!r.photo_url && "🥗"}
              {r.duree_minutes && (
                <span className="font-body" style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 7px", borderRadius: 10 }}>
                  {r.duree_minutes} min
                </span>
              )}
            </div>
            <div style={{ padding: "9px 10px 11px" }}>
              {r.gout && (
                <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
                  {TTL_RECETTE_GOUT_LABELS[r.gout]}
                </p>
              )}
              <p className="font-body" style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "2px 0 0", lineHeight: 1.3 }}>{r.titre}</p>
              {r.macros?.calories && (
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 11, margin: "3px 0 0" }}>{r.macros.calories} kcal</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {filtrees.length === 0 && (
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Aucune recette ici pour l&apos;instant.</p>
      )}

      {openRecette && <FicheRecette recette={openRecette} onClose={() => setOpenRecette(null)} />}
    </div>
  );
}

function FicheRecette({ recette, onClose }: { recette: TtlRecette; onClose: () => void }) {
  const surtitre = [
    recette.categorie ? TTL_RECETTE_CATEGORIE_LABELS[recette.categorie] : null,
    recette.gout ? TTL_RECETTE_GOUT_LABELS[recette.gout] : null,
    recette.duree_minutes ? `${recette.duree_minutes} min` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        {recette.photo_url && (
          <div style={{ width: "100%", height: 180, backgroundImage: `url(${recette.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        )}
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <div>
              {surtitre && (
                <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>
                  {surtitre}
                </p>
              )}
              <p className="font-body" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>{recette.titre}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: ttlColors.muted, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>

          {recette.macros && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {Object.entries(recette.macros).map(([key, value]) => (
                <span key={key} className="font-body" style={{ fontSize: "0.7rem", color: "#F5F5F0", backgroundColor: ttlColors.bg, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 20, padding: "4px 10px" }}>
                  {value}{key === "calories" ? " kcal" : key === "proteines" ? " g prot." : key === "glucides" ? " g gluc." : key === "lipides" ? " g lip." : ` ${key}`}
                </span>
              ))}
            </div>
          )}

          {recette.ingredients && (
            <>
              <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttlColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>INGRÉDIENTS</p>
              <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 14px" }}>
                {recette.ingredients}
              </p>
            </>
          )}

          {recette.texte && (
            <>
              <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttlColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>PRÉPARATION</p>
              <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                {recette.texte}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
