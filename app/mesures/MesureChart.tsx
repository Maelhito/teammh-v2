"use client";

import type { Mesure, MesureChamp } from "@/lib/mesures";
import { trierParDate } from "@/lib/mesures";

/**
 * Courbe d'évolution d'une mesure. Volontairement simple : avec une prise toutes
 * les 2 semaines, on affiche les valeurs réelles reliées, pas une moyenne lissée
 * (le lissage n'a de sens qu'avec des relevés quotidiens).
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

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
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

        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.valeur)} r={i === points.length - 1 ? 3.5 : 2.5}
            fill={i === points.length - 1 ? couleur : fondPoint} stroke={couleur} strokeWidth="1.5" />
        ))}
      </svg>

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
