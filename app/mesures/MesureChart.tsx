"use client";

import { useId, useState } from "react";
import type { Mesure, MesureChamp } from "@/lib/mesures";
import { trierParDate } from "@/lib/mesures";

/**
 * Échelle fixe par unité : la hauteur du graphique représente toujours la même
 * amplitude, pour que 11 kg perdus descendent presque 3 fois plus bas que 4 kg
 * (avant, chaque courbe s'étirait sur toute la hauteur, quel que soit l'écart).
 * Une ligne de grille = un « pas » (1 kg, 2 cm). Si l'écart dépasse la fenêtre,
 * elle s'agrandit juste assez pour que la courbe reste dans le rectangle.
 */
const ECHELLE: Record<string, { fenetre: number; pas: number; labelTous: number }> = {
  kg: { fenetre: 10, pas: 1, labelTous: 2 },
  cm: { fenetre: 16, pas: 2, labelTous: 4 },
};

/**
 * Tracé courbe qui passe exactement par chaque mesure (spline cubique monotone) :
 * les virages sont arrondis, mais la courbe ne descend jamais sous la vraie valeur
 * la plus basse ni ne monte au-dessus de la plus haute — pas de fausse bosse.
 */
function traceLisse(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 3) return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let out = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (pts[i + 1].x - pts[i].x) / 3;
    out += ` C ${pts[i].x + h} ${pts[i].y + m[i] * h}, ${pts[i + 1].x - h} ${pts[i + 1].y - m[i + 1] * h}, ${pts[i + 1].x} ${pts[i + 1].y}`;
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
  const PAD_X = 8;
  const PAD_Y = 9;

  const echelle = ECHELLE[unite] ?? { fenetre: 10, pas: 1, labelTous: 2 };
  const valeurs = points.map((p) => p.valeur);
  const vMin = Math.min(...valeurs);
  const vMax = Math.max(...valeurs);
  const depart = points[0].valeur;
  const descend = points[points.length - 1].valeur <= depart;

  // Fenêtre fixe, agrandie seulement si les mesures ne tiennent pas dedans
  const fenetre = Math.max(echelle.fenetre, (vMax - vMin) * 1.06);
  const respiration = fenetre * 0.03;
  // Perte : on part du haut et on descend. Prise : on part du bas et on monte.
  const max = descend ? vMax + respiration : vMin - respiration + fenetre;
  const min = max - fenetre;
  // L'objectif n'est affiché que s'il tient dans la fenêtre (sinon il écraserait l'échelle)
  const objectifVisible = objectif != null && objectif >= min && objectif <= max;

  const x = (i: number) => PAD_X + (i * (W - PAD_X * 2)) / (points.length - 1);
  const y = (v: number) => PAD_Y + ((max - v) * (H - PAD_Y * 2)) / (max - min);

  const d = traceLisse(points.map((p, i) => ({ x: x(i), y: y(p.valeur) })));
  const aire = `${d} L ${x(points.length - 1)} ${H - PAD_Y} L ${x(0)} ${H - PAD_Y} Z`;

  // Lignes de grille alignées sur la valeur de départ : 0, −1, −2 kg…
  // On espace les pas si la fenêtre a dû beaucoup s'agrandir, pour ne pas griser le graphique.
  const facteur = Math.max(1, Math.round(fenetre / echelle.fenetre));
  const pas = echelle.pas * facteur;
  const labelTous = echelle.labelTous * facteur;
  const grille: { v: number; ecart: number }[] = [];
  for (let k = Math.ceil((min - depart) / pas); depart + k * pas <= max; k++) {
    grille.push({ v: depart + k * pas, ecart: Math.round(k * pas * 10) / 10 });
  }
  const couleurGrille = clair ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
  const couleurGrilleForte = clair ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)";

  // Chute totale depuis le départ, dessinée comme une flèche au bout de la courbe
  const chute = Math.round((points[points.length - 1].valeur - depart) * 10) / 10;
  const montrerChute = Math.abs(chute) >= echelle.pas;
  const xFin = x(points.length - 1);
  const yDepart = y(depart);
  const yFin = y(points[points.length - 1].valeur);

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

          {/* Grille : une ligne par pas, étiquetée en écart depuis le départ */}
          {grille.map(({ v, ecart }) => {
            const etiquette = ecart !== 0 && Math.abs(ecart) % labelTous === 0;
            return (
              <g key={v}>
                <line
                  x1={PAD_X} y1={y(v)} x2={W - PAD_X} y2={y(v)}
                  stroke={ecart === 0 || etiquette ? couleurGrilleForte : couleurGrille}
                  strokeWidth="0.6"
                  strokeDasharray={ecart === 0 ? "3 3" : undefined}
                />
                {etiquette && (
                  <text x={PAD_X + 1} y={y(v) - 1.5} textAnchor="start" fill={texteFaible} fontSize="6.5" fontFamily="system-ui">
                    {ecart > 0 ? "+" : "−"}{Math.abs(ecart)} {unite}
                  </text>
                )}
              </g>
            );
          })}

          {/* Ligne d'objectif */}
          {objectif != null && objectifVisible && (
            <g>
              <line
                x1={PAD_X} y1={y(objectif)} x2={W - PAD_X} y2={y(objectif)}
                stroke="#4ADE80" strokeWidth="1" strokeDasharray="4 4" opacity="0.7"
              />
              <text x={W - PAD_X} y={y(objectif) - 4} textAnchor="end" fill="#4ADE80" fontSize="8">
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
              <line x1={PAD_X} y1={yDepart} x2={xFin} y2={yDepart} stroke={couleur} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />
              <line x1={xFin} y1={yDepart} x2={xFin} y2={yFin} stroke={couleur} strokeWidth="1.4" />
              <text
                x={xFin - 7} y={chute < 0 ? yDepart + 17 : yDepart - 6} textAnchor="end"
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
