"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";
import { categorieAvecGout, TTL_PLAN_CALORIES, TTL_RECETTE_CALORIES, TTL_RECETTE_CATEGORIE_LABELS, TTL_RECETTE_GOUT_LABELS } from "@/lib/ttl";
import type { TtlPlanAlimentaire, TtlPlanPages, TtlRecette, TtlRecetteCategorie, TtlRecetteGout } from "@/lib/ttl";
import { TtlFilterChip } from "@/components/TtlUI";
import GuideEquivalences from "@/components/GuideEquivalences";

interface Props {
  plans: TtlPlanAlimentaire[];
  recettes: TtlRecette[];
  /** Recette à ouvrir d'emblée (lien « Recette du jour » de l'accueil). */
  recetteInitiale?: string;
}

const ONGLETS = ["Plans alimentaires", "Recettes", "Équivalences"] as const;
const CATEGORIE_ORDER: TtlRecetteCategorie[] = ["repas", "petit_dej", "collation"];

function formatKcal(calories: number) {
  return `${calories.toLocaleString("fr-FR")} kcal`;
}

export default function TtlAlimentation({ plans, recettes, recetteInitiale }: Props) {
  const aOuvrir = recettes.find((r) => r.id === recetteInitiale && r.categorie) ?? null;
  const [onglet, setOnglet] = useState(aOuvrir ? 1 : 0);

  // On change d'onglet uniquement en touchant les boutons : plus de glissement
  // gauche/droite entre les panneaux, qui basculait d'onglet au moindre scroll
  // un peu en biais. Les panneaux restent montés (display: none) pour garder
  // leur état (plan choisi, filtres, recherche du guide).
  function allerA(index: number) {
    setOnglet(index);
  }

  return (
    <div style={{ padding: "20px 0 100px" }}>
      <div style={{ margin: "0 20px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 14, padding: 4 }}>
        {ONGLETS.map((label, i) => (
          <button
            key={label}
            onClick={() => allerA(i)}
            aria-pressed={onglet === i}
            className="font-body"
            style={{
              background: onglet === i ? ttlColors.red : "transparent",
              color: onglet === i ? "#fff" : ttlColors.muted,
              border: "none", borderRadius: 10, padding: "11px 4px",
              fontSize: 13, lineHeight: 1.2, fontWeight: onglet === i ? 700 : 500, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...panneauStyle, display: onglet === 0 ? "block" : "none" }}>
        <PanneauPlans plans={plans} />
      </div>
      <div style={{ ...panneauStyle, display: onglet === 1 ? "block" : "none" }}>
        <PanneauRecettes recettes={recettes} recetteInitiale={aOuvrir} />
      </div>
      <div style={{ ...panneauStyle, display: onglet === 2 ? "block" : "none" }}>
        <GuideEquivalences variante="ttl" />
      </div>
      <style>{`.ttl-alim-slider::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

const panneauStyle: React.CSSProperties = {
  width: "100%", padding: "0 20px", boxSizing: "border-box",
};

/* ------------------------------------------------------------------ */
/* Plans alimentaires                                                  */
/* ------------------------------------------------------------------ */

/** Empêche l'appui long « Enregistrer l'image » et le glisser-déposer des pages. */
const protegeImage = {
  draggable: false,
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
} as const;
const protegeStyle: React.CSSProperties = { WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none" };

function PanneauPlans({ plans }: { plans: TtlPlanAlimentaire[] }) {
  const niveaux = TTL_PLAN_CALORIES.filter((c) => plans.some((p) => p.calories === c));
  const [calories, setCalories] = useState<number | null>(niveaux[0] ?? null);
  const plansDuNiveau = plans.filter((p) => p.calories === calories);
  const [choisiId, setChoisiId] = useState<string | null>(plansDuNiveau[0]?.id ?? null);
  const choisi = plans.find((p) => p.id === choisiId) ?? null;

  const cache = useRef(new Map<string, TtlPlanPages>());
  const [contenu, setContenu] = useState<TtlPlanPages | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pageOuverte, setPageOuverte] = useState<number | null>(null);

  useEffect(() => {
    if (!choisiId) return;
    const enCache = cache.current.get(choisiId);
    setErreur(false);
    if (enCache) { setContenu(enCache); return; }
    setContenu(null);
    let annule = false;
    fetch(`/api/ttl/plans-alimentaires/${choisiId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: TtlPlanPages) => {
        cache.current.set(choisiId, d);
        if (!annule) setContenu(d);
      })
      .catch(() => { if (!annule) setErreur(true); });
    return () => { annule = true; };
  }, [choisiId]);

  function choisirNiveau(c: number) {
    setCalories(c);
    setChoisiId(plans.find((p) => p.calories === c)?.id ?? null);
  }

  if (plans.length === 0) {
    return <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Les plans alimentaires arrivent bientôt.</p>;
  }

  return (
    <div>
      <p className="font-body" style={{ color: ttlColors.offWhite, fontSize: 14, lineHeight: 1.5, margin: "0 0 14px" }}>
        <strong>1.</strong> Choisis ton apport calorique.<br />
        <strong>2.</strong> Feuillette ton plan, touche une page pour l&apos;agrandir.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${niveaux.length}, 1fr)`, gap: 6, marginBottom: plansDuNiveau.length > 1 ? 10 : 18 }}>
        {niveaux.map((c) => {
          const actif = calories === c;
          return (
            <button
              key={c}
              onClick={() => choisirNiveau(c)}
              className="font-body"
              style={{
                background: actif ? ttlColors.red : ttlColors.card,
                border: `1px solid ${actif ? ttlColors.red : ttlColors.cardBorder}`,
                borderRadius: 12, padding: "10px 2px", cursor: "pointer", color: actif ? "#fff" : ttlColors.offWhite,
              }}
            >
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{c.toLocaleString("fr-FR")}</span>
              <span style={{ display: "block", fontSize: 10, color: actif ? "rgba(255,255,255,0.85)" : ttlColors.muted }}>kcal</span>
            </button>
          );
        })}
      </div>

      {plansDuNiveau.length > 1 && (
        <div className="ttl-alim-slider" style={{ display: "flex", gap: 8, overflowX: "auto", overscrollBehaviorX: "contain", scrollbarWidth: "none", margin: "0 -20px 18px", padding: "0 20px" }}>
          {plansDuNiveau.map((p) => (
            <TtlFilterChip key={p.id} active={p.id === choisiId} onClick={() => setChoisiId(p.id)}>Plan N°{p.numero}</TtlFilterChip>
          ))}
        </div>
      )}

      {choisi && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <p className="font-body" style={{ color: ttlColors.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Plan N°{choisi.numero} · {formatKcal(choisi.calories)}</p>
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0 }}>{choisi.nb_pages} pages</p>
          </div>

          {erreur ? (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>
              Impossible d&apos;afficher ce plan. Vérifie ta connexion et réessaie.
            </p>
          ) : (
            <Eventail key={choisi.id} miniatures={contenu?.miniatures ?? null} onOpen={setPageOuverte} />
          )}
        </>
      )}

      {choisi && contenu && pageOuverte !== null && (
        <LecteurPages
          titre={`Plan N°${choisi.numero} · ${formatKcal(choisi.calories)}`}
          pages={contenu.pages}
          depart={pageOuverte}
          onClose={() => setPageOuverte(null)}
        />
      )}
    </div>
  );
}

/**
 * Les pages du plan déployées en éventail : la page courante au centre, les suivantes
 * et précédentes inclinées de part et d'autre. On glisse pour feuilleter.
 */
function Eventail({ miniatures, onOpen }: { miniatures: string[] | null; onOpen: (index: number) => void }) {
  const [courant, setCourant] = useState(0);
  const [decalage, setDecalage] = useState(0);
  const [deploye, setDeploye] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);
  const [largeur, setLargeur] = useState(320);
  const conteneur = useRef<HTMLDivElement>(null);
  const geste = useRef<{ x: number; index: number; bouge: boolean } | null>(null);

  const total = miniatures?.length ?? 5;
  const largeurCarte = largeur * 0.74;
  const hauteurCarte = largeurCarte / ratio;
  const pas = largeurCarte * 0.42;

  useLayoutEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    // Onglet masqué (display: none) : largeur 0, on garde la dernière connue.
    const observer = new ResizeObserver(() => { if (el.clientWidth > 0) setLargeur(el.clientWidth); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // L'éventail s'ouvre une fois les miniatures prêtes : les cartes partent empilées puis se déploient.
  useEffect(() => {
    if (!miniatures) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDeploye(true)));
    return () => cancelAnimationFrame(id);
  }, [miniatures]);

  function aller(index: number) {
    setCourant(Math.max(0, Math.min(total - 1, index)));
  }

  function onPointerDown(e: React.PointerEvent) {
    const carte = (e.target as HTMLElement).closest<HTMLElement>("[data-page]");
    geste.current = { x: e.clientX, index: carte ? Number(carte.dataset.page) : -1, bouge: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = geste.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 6) g.bouge = true;
    if (g.bouge) setDecalage(dx);
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = geste.current;
    geste.current = null;
    if (!g) return;
    const dx = e.clientX - g.x;
    setDecalage(0);

    if (!g.bouge) {
      if (g.index < 0 || !miniatures) return;
      if (g.index === courant) onOpen(courant);
      else aller(g.index);
      return;
    }
    // Un geste franc tourne au moins une page, même court.
    const pages = Math.abs(dx) < pas * 0.5 ? Math.sign(dx) : Math.round(dx / pas);
    aller(courant - pages);
  }

  const enGeste = decalage !== 0;
  const position = courant - decalage / pas;

  // overflow "clip" et non "hidden" : un bloc "hidden" reste défilable par le focus des flèches.
  return (
    <div style={{ margin: "0 -20px", overflow: "clip", ...protegeStyle }}>
      <div
        ref={conteneur}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { geste.current = null; setDecalage(0); }}
        style={{ position: "relative", height: hauteurCarte + 70, touchAction: "pan-y", cursor: enGeste ? "grabbing" : "grab" }}
      >
        {Array.from({ length: total }, (_, i) => {
          const o = i - position;
          const distance = Math.abs(o);
          if (distance > 4.5) return null;
          const ouvert = deploye ? 1 : 0;
          const transform = [
            "translateX(-50%)",
            `translateX(${o * pas * ouvert}px)`,
            `translateY(${distance * 10 * ouvert}px)`,
            `rotate(${o * 8 * ouvert}deg)`,
            `scale(${1 - Math.min(distance, 4) * 0.07 * ouvert})`,
          ].join(" ");
          return (
            <div
              key={i}
              data-page={i}
              style={{
                position: "absolute", left: "50%", top: 22, width: largeurCarte, height: hauteurCarte,
                transform, transformOrigin: "50% 120%",
                zIndex: 100 - Math.round(distance * 10),
                opacity: distance > 3.5 ? Math.max(0, 4.5 - distance) : 1,
                transition: enGeste ? "none" : `transform 0.55s cubic-bezier(.2,.9,.25,1.15) ${deploye ? 0 : distance * 45}ms, opacity 0.3s`,
                borderRadius: 12, overflow: "hidden", background: miniatures ? "#fff" : ttlColors.card,
                border: `1px solid ${miniatures ? "rgba(0,0,0,0.08)" : ttlColors.cardBorder}`,
                boxShadow: `0 ${10 + distance * 4}px ${24 + distance * 6}px rgba(0,0,0,${0.55 - Math.min(distance, 3) * 0.08})`,
              }}
            >
              {miniatures && (
                <img
                  src={miniatures[i]}
                  alt={`Page ${i + 1}`}
                  loading={distance < 3 ? "eager" : "lazy"}
                  onLoad={i === 0 ? (e) => { const im = e.currentTarget; if (im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight); } : undefined}
                  {...protegeImage}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", ...protegeStyle }}
                />
              )}
              {/* Les cartes du fond s'assombrissent pour que la page courante ressorte. */}
              <div style={{ position: "absolute", inset: 0, background: "#000", opacity: Math.min(distance, 3) * 0.14, transition: enGeste ? "none" : "opacity 0.4s", pointerEvents: "none" }} />
            </div>
          );
        })}
      </div>

      <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button onClick={() => aller(courant - 1)} disabled={courant === 0 || !miniatures} aria-label="Page précédente" style={{ ...flechePetiteStyle, opacity: courant === 0 ? 0.3 : 1 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <p className="font-body" style={{ color: ttlColors.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
            {miniatures ? `Page ${courant + 1} / ${total}` : " "}
          </p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 11, margin: "2px 0 0" }}>Glisse pour feuilleter · touche pour agrandir</p>
        </div>
        <button onClick={() => aller(courant + 1)} disabled={courant === total - 1 || !miniatures} aria-label="Page suivante" style={{ ...flechePetiteStyle, opacity: courant === total - 1 ? 0.3 : 1 }}>›</button>
      </div>
    </div>
  );
}

const flechePetiteStyle: React.CSSProperties = {
  width: 38, height: 38, borderRadius: "50%", border: `1px solid ${ttlColors.cardBorder}`, background: ttlColors.card, color: ttlColors.text, fontSize: 20, cursor: "pointer", flexShrink: 0,
};

const ZOOM_MAX = 5;
const ZOOM_DOUBLE_TOUCHE = 2.5;

type Vue = { s: number; x: number; y: number };
type Point = { x: number; y: number };
type Geste =
  | { type: "pince"; d0: number; s0: number; ancre: Point }
  | { type: "doigt"; depart: Point; vue0: Vue; debut: number; bouge: boolean };

/**
 * Lecteur plein écran des pages de plan et des recettes, pensé pour le téléphone :
 * on pince à deux doigts pour zoomer exactement où l'on veut, on touche deux fois
 * pour zoomer / dézoomer, on se déplace d'un doigt dans la photo zoomée, et on
 * glisse pour passer à la suivante quand on n'est pas zoomé. Fond toujours noir,
 * quel que soit le mode jour / nuit : c'est une visionneuse photo.
 */
function LecteurPages({ titre, libelle = "Page", pages, depart, onClose }: { titre: string; libelle?: string; pages: string[]; depart: number; onClose: () => void }) {
  const [page, setPage] = useState(depart);
  const [vue, setVueAffichee] = useState<Vue>({ s: 1, x: 0, y: 0 });
  const [glisse, setGlisseAffiche] = useState(0);
  const glisseRef = useRef(0);
  const [anime, setAnime] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const vueRef = useRef<Vue>({ s: 1, x: 0, y: 0 });
  const tailles = useRef(new Map<number, { w: number; h: number }>());
  const pointeurs = useRef(new Map<number, Point>());
  const geste = useRef<Geste | null>(null);
  const dernierTap = useRef<{ t: number; p: Point } | null>(null);
  const pageRef = useRef(depart);

  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = precedent; };
  }, []);

  // Safari zoome toute la page au pincement si on ne l'en empêche pas.
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const bloquer = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", bloquer);
    el.addEventListener("gesturechange", bloquer);
    return () => {
      el.removeEventListener("gesturestart", bloquer);
      el.removeEventListener("gesturechange", bloquer);
    };
  }, []);

  useEffect(() => {
    function clavier(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") changerPage(pageRef.current - 1);
      else if (e.key === "ArrowRight") changerPage(pageRef.current + 1);
    }
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  });

  /** Repère centré sur la scène : (0, 0) est le milieu de l'écran photo. */
  function setGlisse(dx: number) {
    glisseRef.current = dx;
    setGlisseAffiche(dx);
  }

  function versScene(clientX: number, clientY: number): Point {
    const r = scene.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }

  /** Applique un zoom en empêchant la photo de sortir de l'écran. */
  function poser(v: Vue) {
    const el = scene.current;
    const s = Math.min(ZOOM_MAX, Math.max(1, v.s));
    let { x, y } = v;
    const taille = tailles.current.get(pageRef.current);
    if (el && taille) {
      const W = el.clientWidth, H = el.clientHeight;
      const k = Math.min(W / taille.w, H / taille.h);
      const mx = Math.max(0, (taille.w * k * s - W) / 2);
      const my = Math.max(0, (taille.h * k * s - H) / 2);
      x = Math.min(mx, Math.max(-mx, x));
      y = Math.min(my, Math.max(-my, y));
    }
    if (s === 1) { x = 0; y = 0; }
    vueRef.current = { s, x, y };
    setVueAffichee(vueRef.current);
  }

  /** Zoome d'un facteur en gardant fixe le point p de l'écran. */
  function zoomerVers(s: number, p: Point) {
    const v = vueRef.current;
    const ancre = { x: (p.x - v.x) / v.s, y: (p.y - v.y) / v.s };
    poser({ s, x: p.x - ancre.x * s, y: p.y - ancre.y * s });
  }

  function changerPage(cible: number) {
    if (cible < 0 || cible >= pages.length) return;
    setAnime(true);
    setPage(cible);
    pageRef.current = cible;
    poser({ s: 1, x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* doigt déjà levé */ }
    pointeurs.current.set(e.pointerId, versScene(e.clientX, e.clientY));
    setAnime(false);
    const pts = [...pointeurs.current.values()];
    const v = vueRef.current;
    if (pts.length >= 2) {
      const [a, b] = pts;
      const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      setGlisse(0);
      geste.current = { type: "pince", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: v.s, ancre: { x: (milieu.x - v.x) / v.s, y: (milieu.y - v.y) / v.s } };
    } else {
      geste.current = { type: "doigt", depart: pts[0], vue0: v, debut: Date.now(), bouge: false };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.set(e.pointerId, versScene(e.clientX, e.clientY));
    const g = geste.current;
    if (!g) return;
    const pts = [...pointeurs.current.values()];

    if (g.type === "pince" && pts.length >= 2) {
      const [a, b] = pts;
      const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(ZOOM_MAX, Math.max(1, g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
      poser({ s, x: milieu.x - g.ancre.x * s, y: milieu.y - g.ancre.y * s });
    } else if (g.type === "doigt") {
      const p = pts[0];
      const dx = p.x - g.depart.x, dy = p.y - g.depart.y;
      if (Math.hypot(dx, dy) > 8) g.bouge = true;
      if (!g.bouge) return;
      if (g.vue0.s > 1) {
        poser({ s: g.vue0.s, x: g.vue0.x + dx, y: g.vue0.y + dy });
      } else {
        // Au bord (première / dernière photo), le glissement résiste.
        const auBord = (pageRef.current === 0 && dx > 0) || (pageRef.current === pages.length - 1 && dx < 0);
        setGlisse(auBord ? dx / 3 : dx);
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!pointeurs.current.delete(e.pointerId)) return;
    const g = geste.current;
    const restants = [...pointeurs.current.values()];

    // On lève un doigt d'un pincement : l'autre continue à déplacer la photo.
    if (restants.length === 1) {
      geste.current = { type: "doigt", depart: restants[0], vue0: vueRef.current, debut: 0, bouge: true };
      return;
    }
    if (restants.length > 0) return;
    geste.current = null;
    setAnime(true);

    if (g?.type === "doigt" && !g.bouge && Date.now() - g.debut < 300) {
      const p = versScene(e.clientX, e.clientY);
      const avant = dernierTap.current;
      if (avant && Date.now() - avant.t < 350 && Math.hypot(p.x - avant.p.x, p.y - avant.p.y) < 40) {
        dernierTap.current = null;
        if (vueRef.current.s > 1) poser({ s: 1, x: 0, y: 0 });
        else zoomerVers(ZOOM_DOUBLE_TOUCHE, p);
      } else {
        dernierTap.current = { t: Date.now(), p };
      }
      return;
    }

    if (g?.type === "doigt" && g.vue0.s <= 1 && scene.current) {
      const seuil = scene.current.clientWidth * 0.15;
      if (glisseRef.current < -seuil) changerPage(pageRef.current + 1);
      else if (glisseRef.current > seuil) changerPage(pageRef.current - 1);
    }
    setGlisse(0);
  }

  function onPointerCancel(e: React.PointerEvent) {
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size === 0) {
      geste.current = null;
      setAnime(true);
      setGlisse(0);
    }
  }

  function zoomBouton(facteur: number) {
    setAnime(true);
    zoomerVers(vueRef.current.s * facteur, { x: 0, y: 0 });
  }

  const zoome = vue.s > 1.01;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#000", display: "flex", flexDirection: "column", ...protegeStyle }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <div style={{ minWidth: 0 }}>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>{titre}</p>
          <p className="font-body" style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: 0 }}>{libelle} {page + 1} / {pages.length}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
      </div>

      <div
        ref={scene}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", touchAction: "none", cursor: zoome ? "grab" : "zoom-in" }}
      >
        <div
          style={{
            display: "flex", width: "100%", height: "100%",
            transform: `translateX(calc(${-page * 100}% + ${glisse}px))`,
            transition: anime ? "transform 0.3s ease" : "none",
          }}
        >
          {pages.map((url, i) => (
            <div key={url} style={{ flex: "0 0 100%", height: "100%", position: "relative", overflow: "hidden" }}>
              {Math.abs(i - page) <= 1 && (
                <div
                  style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    transform: i === page ? `translate(${vue.x}px, ${vue.y}px) scale(${vue.s})` : undefined,
                    transition: anime ? "transform 0.25s ease" : "none",
                    willChange: "transform",
                  }}
                >
                  <img
                    src={url}
                    alt={`${libelle} ${i + 1}`}
                    onLoad={(e) => { const im = e.currentTarget; tailles.current.set(i, { w: im.naturalWidth, h: im.naturalHeight }); }}
                    {...protegeImage}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", pointerEvents: "none", ...protegeStyle }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <p className="font-body" style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, margin: "0 0 10px", textAlign: "center" }}>
          {zoome ? "Déplace-toi avec un doigt · touche 2 fois pour revenir" : "Pince avec 2 doigts ou touche 2 fois pour zoomer"}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button onClick={() => changerPage(page - 1)} disabled={page === 0} aria-label="Précédente" style={{ ...flecheStyle, opacity: page === 0 ? 0.3 : 1 }}>‹</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => zoomBouton(1 / 1.6)} disabled={!zoome} aria-label="Dézoomer" style={{ ...flecheStyle, opacity: zoome ? 1 : 0.3 }}>−</button>
            <span className="font-body" style={{ color: "#fff", fontSize: 13, fontWeight: 700, minWidth: 48, textAlign: "center" }}>{Math.round(vue.s * 100)} %</span>
            <button onClick={() => zoomBouton(1.6)} disabled={vue.s >= ZOOM_MAX} aria-label="Zoomer" style={{ ...flecheStyle, opacity: vue.s >= ZOOM_MAX ? 0.3 : 1 }}>+</button>
          </div>
          <button onClick={() => changerPage(page + 1)} disabled={page === pages.length - 1} aria-label="Suivante" style={{ ...flecheStyle, opacity: page === pages.length - 1 ? 0.3 : 1 }}>›</button>
        </div>
      </div>
    </div>
  );
}

const flecheStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 24, lineHeight: 1, cursor: "pointer", flexShrink: 0,
};

/* ------------------------------------------------------------------ */
/* Recettes                                                            */
/* ------------------------------------------------------------------ */

function PanneauRecettes({ recettes, recetteInitiale }: { recettes: TtlRecette[]; recetteInitiale: TtlRecette | null }) {
  const [categorie, setCategorie] = useState<TtlRecetteCategorie>(recetteInitiale?.categorie ?? "repas");
  const [gout, setGout] = useState<TtlRecetteGout | "tout">("tout");
  const [calories, setCalories] = useState<number | "toutes">("toutes");
  const [ouverte, setOuverte] = useState<number | null>(() => {
    if (!recetteInitiale) return null;
    const index = recettes.filter((r) => r.categorie === recetteInitiale.categorie).findIndex((r) => r.id === recetteInitiale.id);
    return index >= 0 ? index : null;
  });

  const avecGout = categorieAvecGout(categorie);
  const filtrees = recettes.filter((r) =>
    r.categorie === categorie
    && (!avecGout || gout === "tout" || r.gout === gout)
    && (calories === "toutes" || r.calories === calories));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
        {CATEGORIE_ORDER.map((c) => {
          const actif = categorie === c;
          return (
            <button
              key={c}
              onClick={() => { setCategorie(c); setGout("tout"); setCalories("toutes"); }}
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
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <TtlFilterChip active={gout === "tout"} onClick={() => setGout("tout")}>Tout</TtlFilterChip>
          {(Object.keys(TTL_RECETTE_GOUT_LABELS) as TtlRecetteGout[]).map((g) => (
            <TtlFilterChip key={g} active={gout === g} onClick={() => setGout(g)}>{TTL_RECETTE_GOUT_LABELS[g]}</TtlFilterChip>
          ))}
        </div>
      )}

      <div className="ttl-alim-slider" style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        <TtlFilterChip active={calories === "toutes"} onClick={() => setCalories("toutes")}>Toutes</TtlFilterChip>
        {TTL_RECETTE_CALORIES[categorie].map((k) => (
          <TtlFilterChip key={k} active={calories === k} onClick={() => setCalories(k)}>{k} kcal</TtlFilterChip>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, ...protegeStyle }}>
        {filtrees.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setOuverte(i)}
            aria-label={r.titre}
            style={{ position: "relative", display: "block", width: "100%", padding: 0, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 14, overflow: "hidden", background: ttlColors.card, cursor: "zoom-in", aspectRatio: "1500 / 1054" }}
          >
            <img
              src={r.miniature_url ?? r.photo_url}
              alt={r.titre}
              loading={i < 2 ? "eager" : "lazy"}
              {...protegeImage}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", ...protegeStyle }}
            />
            {/* Sans ce repère, les clientes ne devinaient pas qu'on peut ouvrir la recette en grand. */}
            <span
              className="font-body"
              style={{ position: "absolute", right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.72)", color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "7px 12px", borderRadius: 20, pointerEvents: "none" }}
            >
              🔍 Agrandir
            </span>
          </button>
        ))}
      </div>

      {filtrees.length === 0 && (
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Aucune recette ici pour l&apos;instant.</p>
      )}

      {ouverte !== null && filtrees.length > 0 && (
        <LecteurPages
          titre={[TTL_RECETTE_CATEGORIE_LABELS[categorie], avecGout && gout !== "tout" ? TTL_RECETTE_GOUT_LABELS[gout] : null, calories !== "toutes" ? `${calories} kcal` : null].filter(Boolean).join(" · ")}
          libelle="Recette"
          pages={filtrees.map((r) => r.photo_url)}
          depart={Math.min(ouverte, filtrees.length - 1)}
          onClose={() => setOuverte(null)}
        />
      )}
    </div>
  );
}
