"use client";

import { useId, useState } from "react";
import type { Mesure, MesureChamp } from "@/lib/mesures";
import { trierParDate } from "@/lib/mesures";

/**
 * Échelle calée sur la cliente (comme Azeoo) : le haut du graphique = son plus haut
 * relevé, le bas = son plus bas, arrondis au kg (ou au cm) entier. Une cliente qui
 * a bougé de 1 kg voit donc chacune de ses variations, et 11 kg perdus remplissent
 * toute la hauteur avec 11 lignes de graduation.
 */
function pasDeGraduation(etendue: number): number {
  if (etendue <= 12) return 1;
  if (etendue <= 24) return 2;
  return 5;
}

/**
 * Tracé bien arrondi qui passe par chaque mesure (même principe que les graphiques
 * d'Azeoo) : à chaque point, la courbe suit la direction donnée par ses deux voisins,
 * ce qui donne des virages souples au lieu d'angles. Les points de contrôle restent
 * dans le cadre [haut, bas] pour que les vagues ne débordent jamais du graphique.
 */
const TENSION = 0.5;
function traceLisse(pts: { x: number; y: number }[], haut: number, bas: number): string {
  const n = pts.length;
  if (n < 3) return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const borne = (v: number) => Math.min(bas, Math.max(haut, v));
  // Deux points de contrôle par mesure : un vers la précédente, un vers la suivante
  const avant: { x: number; y: number }[] = [];
  const apres: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (i === 0 || i === n - 1) {
      avant.push(p);
      apres.push(p);
      continue;
    }
    const prec = pts[i - 1];
    const suiv = pts[i + 1];
    const d1 = Math.hypot(p.x - prec.x, p.y - prec.y);
    const d2 = Math.hypot(suiv.x - p.x, suiv.y - p.y);
    const total = d1 + d2 || 1;
    const dx = suiv.x - prec.x;
    const dy = suiv.y - prec.y;
    avant.push({ x: p.x - (TENSION * d1 * dx) / total, y: borne(p.y - (TENSION * d1 * dy) / total) });
    apres.push({ x: p.x + (TENSION * d2 * dx) / total, y: borne(p.y + (TENSION * d2 * dy) / total) });
  }
  let out = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    out += ` C ${apres[i].x} ${apres[i].y}, ${avant[i + 1].x} ${avant[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return out;
}

/**
 * Courbe d'évolution d'une mesure. On affiche les valeurs réelles (pas de moyenne),
 * reliées par une courbe arrondie qui passe par chaque point.
 *
 * Chaque point est survolable / cliquable : la date et la valeur exacte
 * s'affichent au-dessus (le clic sert au tactile, où il n'y a pas de survol).
 */
export default function MesureChart({
  mesures,
  champ,
  unite,
  couleur = "#B22222",
  objectif,
  clair = false,
}: {
  mesures: Mesure[];
  champ: MesureChamp;
  unite: string;
  couleur?: string;
  objectif?: number | null;
  /** true = thème clair (portail coach) */
  clair?: boolean;
}) {
  // Point dont la valeur est affichée (survol souris ou clic tactile)
  const [actif, setActif] = useState<number | null>(null);
  // Identifiants uniques : plusieurs courbes cohabitent sur la même page
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Couleurs adaptées au fond (sombre côté cliente, clair côté coach)
  const fondPoint = clair ? "#FFFFFF" : "#0D0D0D";
  const texteFaible = clair ? "#bbb" : "#4B5563";
  const texteFort = clair ? "#888" : "#9CA3AF";
  const points = trierParDate(mesures)
    .filter((m) => m[champ] != null)
    .map((m) => ({ date: m.date, valeur: Number(m[champ]) }));

  if (points.length < 2) {
    return (
      <div style={{ padding: "28px 16px", textAlign: "center", color: texteFaible, fontSize: "0.8rem" }}>
        {points.length === 0
          ? "Aucune donnée pour l'instant."
          : "Encore une mesure et ta courbe apparaît ici."}
      </div>
    );
  }

  const W = 320;
  const H = 180;
  const PAD_G = 34; // place des kilos écrits à gauche
  const PAD_D = 8;
  const PAD_Y = 9;

  const valeurs = points.map((p) => p.valeur);
  let vMin = Math.min(...valeurs);
  let vMax = Math.max(...valeurs);
  if (objectif != null) {
    vMin = Math.min(vMin, objectif);
    vMax = Math.max(vMax, objectif);
  }
  // Bornes arrondies au pas entier le plus proche, à l'extérieur des mesures
  const pas = pasDeGraduation(Math.ceil(vMax) - Math.floor(vMin));
  const min = Math.floor(vMin / pas) * pas;
  let max = Math.ceil(vMax / pas) * pas;
  if (max === min) max = min + pas;

  const x = (i: number) => PAD_G + (i * (W - PAD_G - PAD_D)) / (points.length - 1);
  const y = (v: number) => PAD_Y + ((max - v) * (H - PAD_Y * 2)) / (max - min);

  const d = traceLisse(points.map((p, i) => ({ x: x(i), y: y(p.valeur) })), PAD_Y, H - PAD_Y);
  const aire = `${d} L ${x(points.length - 1)} ${H - PAD_Y} L ${x(0)} ${H - PAD_Y} Z`;

  const grille: number[] = [];
  for (let v = min; v <= max + 1e-9; v += pas) grille.push(Math.round(v * 10) / 10);
  const couleurGrille = clair ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.09)";

  // Chute totale depuis le départ, écrite en gros au bout de la courbe
  const depart = points[0].valeur;
  const chute = Math.round((points[points.length - 1].valeur - depart) * 10) / 10;
  const xFin = x(points.length - 1);
  const yDepart = y(depart);
  const yFin = y(points[points.length - 1].valeur);
  // L'étiquette va en haut à droite, sinon en bas à droite, là où la courbe ne passe
  // pas ; si les deux coins sont pris, on ne l'affiche pas plutôt que de masquer la courbe.
  const LARGEUR_ETIQUETTE = 75;
  const pointsADroite = points
    .map((p, i) => ({ x: x(i), y: y(p.valeur) }))
    .filter((p, i, t) => p.x >= xFin - LARGEUR_ETIQUETTE - 10 || (t[i + 1] && t[i + 1].x >= xFin - LARGEUR_ETIQUETTE - 10));
  const hautLibre = pointsADroite.every((p) => p.y > PAD_Y + 26);
  const basLibre = pointsADroite.every((p) => p.y < H - PAD_Y - 26);
  const yEtiquette = hautLibre ? PAD_Y + 16 : basLibre ? H - PAD_Y - 8 : null;
  const montrerChute = chute !== 0 && yEtiquette != null;

  const premier = points[0];
  const dernier = points[points.length - 1];

  function labelDate(iso: string) {
    const dt = new Date(iso + "T00:00:00");
    return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  const pointActif = actif != null ? points[actif] : null;
  // Ancrage horizontal : le repère colle au bord gauche au début de la courbe et
  // au bord droit à la fin, pour ne jamais déborder de la carte.
  const ancrage = actif != null ? (x(actif) / W) * 100 : 0;

  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseLeave={() => setActif(null)}
        >
          <defs>
            <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={couleur} stopOpacity="0.5" />
              <stop offset="100%" stopColor={couleur} stopOpacity="0.02" />
            </linearGradient>
            {/* Halo lumineux autour de la ligne */}
            <filter id={`halo-${uid}`} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            {/* La courbe se dessine de gauche à droite à l'ouverture (SMIL : fiable sur Safari) */}
            <clipPath id={`rev-${uid}`}>
              <rect x="0" y="0" width={W} height={H}>
                <animate attributeName="width" from="0" to={W} dur="1.3s" calcMode="spline"
                  keySplines="0.4 0 0.2 1" keyTimes="0;1" fill="freeze" />
              </rect>
            </clipPath>
          </defs>

          {/* Graduations : une ligne par kg (ou par cm), valeur écrite à gauche */}
          {grille.map((v) => (
            <g key={v}>
              <line x1={PAD_G} y1={y(v)} x2={W - PAD_D} y2={y(v)} stroke={couleurGrille} strokeWidth="0.6" />
              <text x={PAD_G - 5} y={y(v) + 2.5} textAnchor="end" fill={texteFaible} fontSize="7.5" fontFamily="system-ui">
                {v} {unite}
              </text>
            </g>
          ))}

          {/* Ligne d'objectif */}
          {objectif != null && (
            <g>
              <line
                x1={PAD_G} y1={y(objectif)} x2={W - PAD_D} y2={y(objectif)}
                stroke="#4ADE80" strokeWidth="1" strokeDasharray="4 4" opacity="0.7"
              />
              <text x={W - PAD_D} y={y(objectif) - 4} textAnchor="end" fill="#4ADE80" fontSize="8">
                objectif {objectif} {unite}
              </text>
            </g>
          )}

          <g clipPath={`url(#rev-${uid})`}>
            <path d={aire} fill={`url(#grad-${uid})`} />
            <path d={d} fill="none" stroke={couleur} strokeWidth="5" opacity="0.45" filter={`url(#halo-${uid})`} />
            <path d={d} fill="none" stroke={couleur} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Chute totale : trait du niveau de départ jusqu'à la dernière mesure, avec le total en gros */}
          {montrerChute && (
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.4s" fill="freeze" />
              <line x1={PAD_G} y1={yDepart} x2={xFin} y2={yDepart} stroke={couleur} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />
              <line x1={xFin} y1={yDepart} x2={xFin} y2={yFin} stroke={couleur} strokeWidth="1.4" />
              <text
                x={xFin - 7} y={yEtiquette ?? 0} textAnchor="end"
                fill={couleur} fontSize="15" fontWeight="800" fontFamily="system-ui"
              >
                {chute > 0 ? "+" : "−"}{Math.abs(chute)} {unite}
              </text>
            </g>
          )}

          {/* Repère vertical du point sélectionné */}
          {actif != null && (
            <line
              x1={x(actif)} y1={PAD_Y} x2={x(actif)} y2={H - PAD_Y}
              stroke={couleur} strokeWidth="1" strokeDasharray="3 3" opacity="0.45"
            />
          )}

          {/* Onde qui pulse autour de la dernière mesure */}
          <circle cx={xFin} cy={yFin} r="4" opacity="0" fill="none" stroke={couleur} strokeWidth="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" begin="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.8s" begin="1.3s" repeatCount="indefinite" />
          </circle>

          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.valeur)} r={i === actif ? 4.5 : i === points.length - 1 ? 4 : 2.5}
              fill={i === actif || i === points.length - 1 ? couleur : fondPoint} stroke={couleur} strokeWidth="1.5" />
          ))}

          {/* Zones de survol/clic : bien plus larges que les points, sinon impossible à viser */}
          {points.map((p, i) => (
            <circle
              key={`hit-${i}`}
              cx={x(i)}
              cy={y(p.valeur)}
              r={12}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setActif(i)}
              onClick={() => setActif((a) => (a === i ? null : i))}
            />
          ))}
        </svg>

        {/* Valeur exacte du point survolé / cliqué */}
        {pointActif && (
          <div
            style={{
              position: "absolute",
              left: `${ancrage}%`,
              top: `${(y(pointActif.valeur) / H) * 100}%`,
              transform: `translate(-${ancrage}%, calc(-100% - 10px))`,
              backgroundColor: clair ? "#1a1a1a" : "#F5F5F5",
              color: clair ? "#fff" : "#0D0D0D",
              borderRadius: 7,
              padding: "5px 9px",
              fontSize: "0.68rem",
              fontFamily: "system-ui",
              fontWeight: 700,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 3px 10px rgba(0,0,0,0.22)",
              zIndex: 2,
            }}
          >
            {pointActif.valeur} {unite}
            <span style={{ opacity: 0.6, fontWeight: 400, marginLeft: 6 }}>{labelDate(pointActif.date)}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "0.65rem", color: texteFaible }}>
          {labelDate(premier.date)} · {premier.valeur} {unite}
        </span>
        <span style={{ fontSize: "0.65rem", color: texteFort }}>
          {labelDate(dernier.date)} · {dernier.valeur} {unite}
        </span>
      </div>
    </div>
  );
}
