"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/equivalences/donnees";
import {
  parcourir,
  rechercher,
  suggestions as chercherSuggestions,
  trouverAliment,
  type Bande,
  type GroupeParcours,
  type LigneNutri,
  type ResultatRecherche,
} from "@/lib/equivalences/moteur";

/**
 * Guide interactif des équivalences alimentaires (repris de l'artefact de Julie).
 * Utilisé dans le module Time To Move et dans l'onglet Alimentation de Time To Live.
 */

interface Theme {
  card: string;
  cardBorder: string;
  muted: string;
}

const THEMES: Record<"ttm" | "ttl", Theme> = {
  ttm: { card: "#111111", cardBorder: "#1f1f1f", muted: "#8B8B8B" },
  ttl: { card: "#1A1414", cardBorder: "#2A2020", muted: "#8A8078" },
};

type Vue =
  | { type: "vide" }
  | { type: "introuvable"; saisie: string }
  | { type: "resultat"; resultat: ResultatRecherche }
  | { type: "parcours"; categorieId: string; groupes: GroupeParcours[] };

export default function GuideEquivalences({ variante = "ttm" }: { variante?: "ttm" | "ttl" }) {
  const theme = THEMES[variante];
  const [saisie, setSaisie] = useState("");
  const [quantite, setQuantite] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [vue, setVue] = useState<Vue>({ type: "vide" });
  const [infos, setInfos] = useState(false);
  const champRef = useRef<HTMLDivElement>(null);
  const quantiteRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  const liste = ouvert ? chercherSuggestions(saisie) : [];
  const categorieActive = vue.type === "parcours" ? vue.categorieId : null;

  // Un clic ailleurs referme les suggestions.
  useEffect(() => {
    function fermer(e: MouseEvent | TouchEvent) {
      if (champRef.current && !champRef.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    document.addEventListener("touchstart", fermer);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("touchstart", fermer);
    };
  }, []);

  useEffect(() => {
    if (actif < 0) return;
    listeRef.current?.children[actif]?.scrollIntoView({ block: "nearest" });
  }, [actif]);

  function choisir(nom: string) {
    setSaisie(nom);
    setOuvert(false);
    setActif(-1);
    quantiteRef.current?.focus();
  }

  function lancer() {
    setOuvert(false);
    const tape = saisie.trim();
    if (!tape) return setVue({ type: "vide" });
    const nom = trouverAliment(tape);
    if (!nom) return setVue({ type: "introuvable", saisie: tape });
    // Safari (clavier français) tape une virgule décimale.
    const brut = quantite.trim().replace(",", ".");
    setVue({ type: "resultat", resultat: rechercher(nom, brut === "" ? null : parseFloat(brut)) });
  }

  function onToucheAliment(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (liste.length) setActif((i) => Math.min(i + 1, liste.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (liste.length) setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (actif >= 0 && liste[actif]) choisir(liste[actif].nom);
      else lancer();
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  return (
    <div
      className="geq font-body"
      style={{ "--geq-card": theme.card, "--geq-border": theme.cardBorder, "--geq-muted": theme.muted } as React.CSSProperties}
    >
      <div className="geq-hero">
        <p className="geq-label">Guide interactif</p>
        <h2 className="geq-h1">Par quoi je peux <em>remplacer</em> cet aliment ?</h2>
        <p className="geq-sub">
          Tape l&apos;aliment de ton plan alimentaire et la quantité indiquée : tu obtiens le grammage de chaque
          alternative, à apport calorique équivalent, dans la même famille d&apos;aliments.
        </p>
      </div>

      <div className="geq-card geq-search">
        <div className="geq-field" ref={champRef}>
          <label htmlFor="geq-aliment">Aliment à remplacer</label>
          <input
            id="geq-aliment"
            type="text"
            placeholder="Ex : crevette, riz, saumon…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={saisie}
            onChange={(e) => { setSaisie(e.target.value); setOuvert(true); setActif(-1); }}
            onFocus={() => setOuvert(true)}
            onKeyDown={onToucheAliment}
          />
          {liste.length > 0 && (
            <div className="geq-suggestions" ref={listeRef} role="listbox">
              {liste.map((s, i) => (
                <button
                  key={s.nom}
                  type="button"
                  role="option"
                  aria-selected={i === actif}
                  className={`geq-suggestion${i === actif ? " actif" : ""}`}
                  onClick={() => choisir(s.nom)}
                >
                  <span className="geq-sugg-icone">{s.icone}</span>
                  {s.nom}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="geq-row">
          <div className="geq-field geq-qty">
            <label htmlFor="geq-quantite">Quantité (g)</label>
            <input
              id="geq-quantite"
              ref={quantiteRef}
              type="text"
              inputMode="decimal"
              placeholder="100"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value.replace(/[^0-9.,]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lancer(); } }}
            />
          </div>
          <button type="button" className="geq-go" onClick={lancer}>Voir les équivalences</button>
        </div>
        <p className="geq-hint">
          Astuce : pendant que tu tapes, une liste de suggestions apparaît juste en dessous du champ. Touche
          l&apos;aliment souhaité dans cette liste plutôt que de finir de taper le nom toi-même, pour être sûre de
          sélectionner le bon aliment.
        </p>
      </div>

      <div className="geq-chips">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`geq-chip${categorieActive === c.id ? " actif" : ""}`}
            onClick={() => {
              setSaisie("");
              setOuvert(false);
              setVue({ type: "parcours", categorieId: c.id, groupes: parcourir(c.id) });
            }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="geq-resultats">
        {vue.type === "vide" && (
          <div className="geq-vide">
            <span className="geq-big">🍽️</span>
            Cherche un aliment ci-dessus, ou choisis une catégorie pour parcourir tout le guide.
          </div>
        )}
        {vue.type === "introuvable" && (
          <div className="geq-nomatch">
            Aucun aliment ne correspond à « {vue.saisie} » dans le guide.
            <br />
            Essaie un autre mot, ou choisis une catégorie ci-dessus pour parcourir la liste complète.
          </div>
        )}
        {vue.type === "resultat" && <Resultat resultat={vue.resultat} />}
        {vue.type === "parcours" && <Parcours categorieId={vue.categorieId} groupes={vue.groupes} />}
      </div>

      <button type="button" className="geq-info-toggle" onClick={() => setInfos((v) => !v)} aria-expanded={infos}>
        ℹ️ Infos utiles : méthode, intolérances &amp; boissons
      </button>
      {infos && <Infos />}

      <style>{CSS}</style>
    </div>
  );
}

function Nutri({ lignes }: { lignes: LigneNutri[] }) {
  if (!lignes.length) return null;
  return (
    <>
      {lignes.map((l) => (
        <span key={l.libelle} className="geq-nutri">{l.valeur}g {l.libelle}</span>
      ))}
    </>
  );
}

function classeBande(b: Bande | null) {
  return b ? ` bande-${b}` : "";
}

function Resultat({ resultat }: { resultat: ResultatRecherche }) {
  const n = resultat.tableaux.length;
  return (
    <>
      {resultat.sansQuantite && (
        <p className="geq-hint geq-hint-haut">
          Aucune quantité saisie : équivalences affichées pour 100g. Entre un grammage pour un calcul sur mesure.
        </p>
      )}
      <div className="geq-heading">
        <h3>{resultat.icone} {resultat.nom}</h3>
        <span className="geq-subtext">
          {n} tableau{n > 1 ? "x" : ""} d&apos;équivalence trouvé{n > 1 ? "s" : ""}
        </span>
      </div>
      {resultat.tableaux.map((t, i) => (
        <div key={i} className="geq-card geq-block">
          <p className="geq-block-title">{t.titre}</p>
          {t.reference && (
            <div className={`geq-ref${classeBande(t.reference.bande)}`}>
              <span className="geq-ref-amt">{t.reference.quantite} {t.reference.unite}</span>
              <span>
                de {resultat.nom}
                {t.reference.kcalTotal !== null && <span className="geq-kcal"> ({t.reference.kcalTotal} kcal)</span>}
                {t.reference.baseDuGuide ? " (base du guide)" : ""} — équivaut à :
              </span>
              {t.reference.nutri.length > 0 && (
                <span className="geq-ref-nutri"><Nutri lignes={t.reference.nutri} /></span>
              )}
            </div>
          )}
          <ul className="geq-list">
            {t.alternatives.length === 0 && (
              <li><span className="geq-name geq-aucun">Aucun autre aliment de ce groupe n&apos;est dans cette fourchette de protéines.</span></li>
            )}
            {t.alternatives.map((a) => (
              <li key={a.nom} className={classeBande(a.bande).trim()} title={a.bandeLibelle ?? undefined}>
                <span className="geq-name">
                  {a.nom}
                  {a.note && <span className="geq-note">{a.note}</span>}
                </span>
                <span className="geq-right">
                  <span className="geq-amt">{a.quantite} {a.unite}</span>
                  <Nutri lignes={a.nutri} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function Parcours({ categorieId, groupes }: { categorieId: string; groupes: GroupeParcours[] }) {
  const cat = CATEGORIES.find((c) => c.id === categorieId)!;
  return (
    <>
      <div className="geq-heading"><h3>{cat.icon} {cat.label}</h3></div>
      {groupes.length === 0 && <div className="geq-nomatch">Rien pour l&apos;instant dans cette catégorie.</div>}
      {groupes.map((g) => (
        <div key={g.libelle} className="geq-browse">
          <h4>{g.libelle}</h4>
          <div className="geq-tags">
            {g.aliments.map((a) => (
              <span key={a.nom} className={`geq-tag${classeBande(a.bande)}`} title={a.bandeLibelle ?? undefined}>
                {a.nom} · {a.valeur}
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Infos() {
  return (
    <div className="geq-infos">
      <div className="geq-card geq-info">
        <h4>Le code couleur</h4>
        <p>Un petit point coloré précède chaque aliment dans les résultats, pour repérer sa densité calorique en un coup d&apos;œil :</p>
        <p>
          <span className="geq-dot bande-vertfonce" /> moins de 100 kcal/100g &nbsp;·&nbsp;{" "}
          <span className="geq-dot bande-vertclair" /> 100 à 150 kcal/100g &nbsp;·&nbsp;{" "}
          <span className="geq-dot bande-jaune" /> 150 à 250 kcal/100g &nbsp;·&nbsp;{" "}
          <span className="geq-dot bande-rouge" /> plus de 250 kcal/100g
        </p>
      </div>
      <div className="geq-card geq-info">
        <h4>Comment ça calcule</h4>
        <p>La plupart des équivalences sont désormais calculées à partir des calories pour 100g : quantité voulue × (calories de l&apos;aliment à remplacer ÷ calories de l&apos;aliment cible). Ça reproduit exactement le produit en croix que tu faisais à la main, mais avec une base de données beaucoup plus large.</p>
        <p>Tu peux remplacer un aliment par un autre uniquement à l&apos;intérieur d&apos;un même tableau : ce sont des groupes pensés pour rester nutritionnellement cohérents (une crevette ne devient pas un saumon fumé, un poisson maigre reste avec les poissons maigres). Les tableaux marqués « valeurs de ton guide d&apos;origine » utilisent encore les ratios donnés à la main, faute de données caloriques pour ces aliments-là.</p>
        <p>La colonne protéines/100g affichée à côté de chaque équivalence est indicative : à calories égales, deux aliments d&apos;un même tableau n&apos;apportent pas forcément exactement la même quantité de protéines.</p>
      </div>
      <InfoDeuxColonnes
        titre="Intolérance au gluten"
        eviter="Blé (froment, épeautre, kamut), orge, seigle, seitan (100% gluten), pain, pâtes, semoule, boulgour"
        privilegier="Riz, maïs / polenta, quinoa, millet, sarrasin, manioc / ignames, taro, patate douce / pomme de terre"
      />
      <InfoDeuxColonnes
        titre="Intolérance au lactose (sucre du lait)"
        eviter="Lait / yaourt / fromage frais d'origine animale, ou tout produit laitier non fermenté"
        privilegier="Fromages affinés (comté, emmental, gruyère, parmesan, beaufort, cheddar), lait sans lactose ou yaourt nature fermenté, tout produit laitier d'origine végétale"
      />
      <InfoDeuxColonnes
        titre="Intolérance à la caséine (protéine du lait)"
        eviter="Tout produit laitier d'origine animale (lait, yaourt, fromage, crème)"
        privilegier="Produits laitiers végétaux, de préférence à base de soja car plus riches en protéines"
      />
      <div className="geq-card geq-info">
        <h4>Boissons sans impact nutritionnel</h4>
        <p>Matcha, café, thé (vert, blanc, noir), eau chaude citronnée, infusions (menthe, verveine, camomille, hibiscus).</p>
        <p>Matcha, thé et café : à consommer jusqu&apos;à 16h maximum pour ne pas perturber le sommeil. À limiter en cas d&apos;anxiété ou de grossesse.</p>
      </div>
    </div>
  );
}

function InfoDeuxColonnes({ titre, eviter, privilegier }: { titre: string; eviter: string; privilegier: string }) {
  return (
    <div className="geq-card geq-info">
      <h4>{titre}</h4>
      <div className="geq-two-col">
        <div><div className="geq-h geq-avoid">À éviter</div>{eviter}</div>
        <div><div className="geq-h geq-prefer">À privilégier</div>{privilegier}</div>
      </div>
    </div>
  );
}

const CSS = `
.geq { color:#F5F5F0; line-height:1.5; }
.geq * { box-sizing:border-box; }
.geq-hero { padding:4px 0 18px; }
.geq-label { font-size:12px; color:#B22222; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin:0 0 8px; }
.geq-h1 { font-size:1.45rem; font-weight:800; line-height:1.15; margin:0 0 10px; color:#F5F5F0; }
.geq-h1 em { font-style:italic; color:#E63946; }
.geq-sub { color:var(--geq-muted); font-size:0.9rem; margin:0; }
.geq-card { background:var(--geq-card); border:1px solid var(--geq-border); border-radius:16px; }
.geq-search { padding:18px; margin-bottom:18px; }
.geq-field { position:relative; }
.geq-row { display:flex; gap:10px; align-items:flex-end; margin-top:12px; }
.geq-qty { flex:0 0 110px; }
.geq label { display:block; font-size:12.5px; font-weight:600; color:var(--geq-muted); margin-bottom:6px; }
.geq input { width:100%; font-family:inherit; font-size:17px; padding:12px 14px; border-radius:11px; border:1.5px solid #2E2E2E; background:#0D0D0D; color:#F5F5F0; outline:none; -webkit-appearance:none; appearance:none; }
.geq input:focus { border-color:#B22222; }
.geq input::placeholder { color:#5A5A5A; }
.geq-suggestions { margin-top:6px; background:#0D0D0D; border:1px solid #2E2E2E; border-radius:12px; max-height:280px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
.geq-suggestion { display:block; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid #1F1F1F; color:#F5F5F0; font-family:inherit; font-size:15px; padding:11px 14px; cursor:pointer; }
.geq-suggestion:last-child { border-bottom:none; }
.geq-suggestion:hover, .geq-suggestion.actif { background:#1E1E1E; }
.geq-sugg-icone { display:inline-block; margin-right:8px; }
.geq-go { flex:1 1 auto; background:#B22222; color:#fff; border:none; border-radius:11px; padding:13px 14px; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer; }
.geq-go:active { transform:scale(0.98); }
.geq-hint { font-size:12.5px; color:var(--geq-muted); margin:12px 0 0; }
.geq-hint-haut { margin:0 0 12px; }
.geq-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:22px; }
.geq-chip { background:var(--geq-card); border:1px solid var(--geq-border); color:#D4D4CF; padding:8px 13px; border-radius:100px; font-size:13.5px; font-weight:500; cursor:pointer; font-family:inherit; }
.geq-chip.actif { background:#B22222; border-color:#B22222; color:#fff; }
.geq-resultats { min-height:40px; }
.geq-vide { text-align:center; padding:32px 16px; color:var(--geq-muted); font-size:14.5px; }
.geq-big { font-size:34px; display:block; margin-bottom:10px; }
.geq-nomatch { background:var(--geq-card); border:1px dashed #3A3A3A; border-radius:16px; padding:22px; text-align:center; color:var(--geq-muted); font-size:14.5px; }
.geq-heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.geq-heading h3 { font-size:1.2rem; font-weight:800; margin:0; }
.geq-subtext { font-size:13px; color:var(--geq-muted); }
.geq-block { padding:16px; margin-bottom:14px; }
.geq-block-title { font-size:13.5px; font-weight:700; color:#F5F5F0; margin:0 0 12px; }
.geq-ref { display:flex; align-items:center; gap:4px 10px; flex-wrap:wrap; background:#222; border-radius:10px; padding:10px 12px; margin-bottom:10px; font-size:14.5px; }
.geq-ref-amt { font-weight:800; font-size:16px; color:#fff; }
.geq-ref-nutri { display:flex; gap:8px; flex-wrap:wrap; width:100%; }
.geq-ref-nutri .geq-nutri { display:inline; }
.geq-kcal { color:var(--geq-muted); font-size:12px; }
.geq-list { list-style:none; margin:0; padding:0; }
.geq-list li { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:9px 10px; margin-bottom:4px; border-radius:10px; font-size:14.5px; }
.geq-name { min-width:0; }
.geq-aucun { font-style:italic; color:var(--geq-muted); }
.geq-note { display:block; font-size:11.5px; color:var(--geq-muted); font-style:italic; }
.geq-right { text-align:right; white-space:nowrap; flex-shrink:0; }
.geq-amt { font-weight:700; color:#fff; font-variant-numeric:tabular-nums; }
.geq-nutri { display:block; font-size:11px; color:var(--geq-muted); }
.geq-dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:4px; vertical-align:middle; }
.geq-dot.bande-vertfonce { background:#22A559; }
.geq-dot.bande-vertclair { background:#9BD35A; }
.geq-dot.bande-jaune { background:#EAC435; }
.geq-dot.bande-rouge { background:#D23B3B; }
.geq .bande-vertfonce:not(.geq-dot) { background:rgba(34,165,89,0.16); }
.geq .bande-vertclair:not(.geq-dot) { background:rgba(155,211,90,0.13); }
.geq .bande-jaune:not(.geq-dot) { background:rgba(234,196,53,0.13); }
.geq .bande-rouge:not(.geq-dot) { background:rgba(210,59,59,0.16); }
.geq-browse { margin-bottom:20px; }
.geq-browse h4 { font-size:1rem; font-weight:700; margin:0 0 8px; }
.geq-tags { display:flex; flex-wrap:wrap; gap:6px; }
.geq-tag { background:var(--geq-card); border:1px solid var(--geq-border); border-radius:8px; padding:5px 9px; font-size:13px; }
.geq-tag[class*="bande-"] { border-color:transparent; }
.geq-info-toggle { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:#F5F5F0; font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; padding:6px 0; margin-top:8px; text-align:left; }
.geq-infos { margin-top:12px; }
.geq-info { padding:16px 18px; margin-bottom:12px; font-size:14px; color:#CFCFC9; }
.geq-info h4 { font-size:1rem; font-weight:700; color:#F5F5F0; margin:0 0 8px; }
.geq-info p { margin:0 0 8px; }
.geq-info p:last-child { margin-bottom:0; }
.geq-two-col { display:flex; gap:16px; flex-wrap:wrap; margin-top:8px; }
.geq-two-col > div { flex:1 1 200px; }
.geq-h { font-weight:700; font-size:13px; margin-bottom:4px; }
.geq-avoid { color:#E63946; }
.geq-prefer { color:#4ADE80; }
`;
