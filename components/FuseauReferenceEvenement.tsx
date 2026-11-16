"use client";

import { dateLisible, decalerJour, formatDateDans, formatHeureDans, instantDepuis, nomLisible } from "@/lib/temps";

/**
 * Les deux pays des clientes. L'heure tapée est fixe dans le pays choisi ;
 * l'autre la voit convertie chez lui.
 */
export const PAYS_REFERENCE = [
  { tz: "Pacific/Noumea", pays: "Nouvelle-Calédonie" },
  { tz: "Europe/Paris", pays: "France" },
] as const;

function libellePays(tz: string): string {
  return PAYS_REFERENCE.find((p) => p.tz === tz)?.pays ?? nomLisible(tz);
}

/**
 * Les heures qu'affiche un fuseau pour une récurrence, sur une année.
 *
 * La France change d'heure, la Nouvelle-Calédonie non : une visio fixée à 19h
 * à Nouméa tombe à 9h à Paris l'hiver et à 10h l'été. On échantillonne une
 * occurrence toutes les 4 semaines sur un an pour le montrer avant d'enregistrer.
 */
function heuresSurUnAn(date: string, heure: string, fuseauRef: string, fuseauLecteur: string): string[] {
  const heures = new Set<string>();
  for (let k = 0; k <= 13; k++) {
    const instant = instantDepuis(decalerJour(date, k * 28), heure, fuseauRef);
    if (instant) heures.add(formatHeureDans(instant, fuseauLecteur));
  }
  return [...heures].sort();
}

interface Props {
  date: string;
  heure: string;
  recurrence: string;
  fuseau: string;
  onChange: (fuseau: string) => void;
  /** Le fuseau de qui remplit le formulaire, proposé s'il n'est ni Nouméa ni Paris. */
  fuseauAuteur: string | null;
}

/**
 * Choix du pays dont l'heure reste fixe, pour un événement posé par l'admin.
 *
 * Avant, l'heure s'enregistrait sans le dire dans le fuseau de qui remplissait
 * le formulaire. Pour une visio de groupe qui réunit la France et la
 * Calédonie, c'est pourtant LA décision : un des deux pays verra l'heure bouger
 * d'une heure deux fois par an, et il vaut mieux le choisir que le subir.
 */
export default function FuseauReferenceEvenement({ date, heure, recurrence, fuseau, onChange, fuseauAuteur }: Props) {
  const options: { tz: string; pays: string }[] = [...PAYS_REFERENCE];
  if (fuseauAuteur && !options.some((o) => o.tz === fuseauAuteur)) {
    options.push({ tz: fuseauAuteur, pays: `Mon heure (${nomLisible(fuseauAuteur)})` });
  }
  if (!options.some((o) => o.tz === fuseau)) options.push({ tz: fuseau, pays: nomLisible(fuseau) });

  const instant = date && heure ? instantDepuis(date, heure, fuseau) : null;
  const recurrent = recurrence !== "none";

  const lignes = instant
    ? PAYS_REFERENCE.map(({ tz, pays }) => {
        const jour = formatDateDans(instant, tz);
        const heures = recurrent ? heuresSurUnAn(date, heure, fuseau, tz) : [formatHeureDans(instant, tz)];
        const decalage = jour < date ? "la veille" : jour > date ? "le lendemain" : null;
        return { tz, pays, jour, heures, decalage };
      })
    : [];

  const texte: React.CSSProperties = { fontSize: 11, fontFamily: "system-ui", lineHeight: 1.6 };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, fontFamily: "system-ui", letterSpacing: "0.03em" }}>
        L&apos;heure tapée est celle de
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const actif = o.tz === fuseau;
          return (
            <button
              key={o.tz}
              type="button"
              onClick={() => onChange(o.tz)}
              style={{
                flex: "1 1 140px", padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                border: `2px solid ${actif ? "#B22222" : "#222"}`,
                backgroundColor: actif ? "rgba(178,34,34,0.1)" : "#0D0D0D",
                color: actif ? "#F5F5F0" : "#666", fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
              }}
            >
              {o.pays}
            </button>
          );
        })}
      </div>

      {instant && (
        <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 8, border: "1px solid #222", backgroundColor: "#0D0D0D" }}>
          {lignes.map((l) => (
            <div key={l.tz} style={{ ...texte, color: "#bbb" }}>
              {l.pays} :{" "}
              {recurrent ? (
                l.heures.length === 1 ? (
                  <strong style={{ color: "#F5F5F0" }}>toute l&apos;année à {l.heures[0]}</strong>
                ) : (
                  <strong style={{ color: "#F87171" }}>
                    {l.heures.join(" ou ")} selon la saison
                  </strong>
                )
              ) : (
                <strong style={{ color: "#F5F5F0" }}>{dateLisible(l.jour)} à {l.heures[0]}</strong>
              )}
              {l.decalage && <span style={{ color: "#F87171" }}> — {l.decalage}</span>}
            </div>
          ))}
          {recurrent && lignes.some((l) => l.heures.length > 1) && (
            <div style={{ ...texte, color: "#666", marginTop: 4 }}>
              L&apos;heure reste fixe en {libellePays(fuseau)} ; l&apos;autre pays change d&apos;heure fin mars et fin octobre.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
