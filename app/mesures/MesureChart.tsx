"use client";

import { useState } from "react";
import type { Mesure, MesureChamp } from "@/lib/mesures";
import { trierParDate } from "@/lib/mesures";

/**
 * Courbe d'évolution d'une mesure. Volontairement simple : avec une prise toutes
 * les 2 semaines, on affiche les valeurs réelles reliées, pas une moyenne lissée
 * (le lissage n'a de sens qu'avec des relevés quotidiens).
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
  const H = 120;
  const PAD_X = 8;
  const PAD_Y = 14;

  const valeurs = points.map((p) => p.valeur);
  let min = Math.min(...valeurs);
  let max = Math.max(...valeurs);
  if (objectif != null) {
    min = Math.min(min, objectif);
    max = Math.max(max, objectif);
  }
  // marge pour ne pas coller aux bords
  const marge = (max - min) * 0.15 || 1;
  min -= marge;
  max += marge;

  const x = (i: number) => PAD_X + (i * (W - PAD_X * 2)) / (points.length - 1);
  const y = (v: number) => PAD_Y + ((max - v) * (H - PAD_Y * 2)) / (max - min);

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.valeur)}`).join(" ");
  const aire = `${d} L ${x(points.length - 1)} ${H - PAD_Y} L ${x(0)} ${H - PAD_Y} Z`;

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
            <linearGradient id={`grad-${champ}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={couleur} stopOpacity="0.28" />
              <stop offset="100%" stopColor={couleur} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Ligne d'objectif */}
          {objectif != null && (
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

          <path d={aire} fill={`url(#grad-${champ})`} />
          <path d={d} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Repère vertical du point sélectionné */}
          {actif != null && (
            <line
              x1={x(actif)} y1={PAD_Y} x2={x(actif)} y2={H - PAD_Y}
              stroke={couleur} strokeWidth="1" strokeDasharray="3 3" opacity="0.45"
            />
          )}

          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.valeur)} r={i === actif ? 4.5 : i === points.length - 1 ? 3.5 : 2.5}
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
