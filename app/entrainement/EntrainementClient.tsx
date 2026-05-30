"use client";

import { useState } from "react";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type CellItem =
  | { _key: string; type: "seance"; seanceId: string; seanceName: string; duree: number | null }
  | { _key: string; type: "seance_locale"; nom: string; duree: number | null; seanceData: unknown }
  | { _key: string; type: "video"; titre: string; url: string; categorie: string; thumb: string | null };

interface Programme {
  id: string;
  nom: string;
  niveau: string;
  date_debut: string | null;
  semaine_courante: number;
  duree_semaines: number;
  note: string;
  grid: Record<string, unknown[]>;
}

function getNiveauLabel(n: string) {
  if (n === "debutant") return "Débutant";
  if (n === "intermediaire") return "Intermédiaire";
  if (n === "avance") return "Avancé";
  return n;
}

function getTodayJourIndex(): number {
  // 1=Lundi ... 7=Dimanche (JS getDay: 0=Dimanche)
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function SeanceCard({ item, isToday }: { item: CellItem; isToday: boolean }) {
  const nom = item.type === "seance" ? item.seanceName : item.type === "seance_locale" ? item.nom : item.titre;
  const duree = item.type !== "video" ? item.duree : null;
  const isVideo = item.type === "video";

  return (
    <div
      style={{
        backgroundColor: isToday ? "#1a0a0a" : "#111111",
        border: `1px solid ${isToday ? "rgba(178,34,34,0.4)" : "#1a1a1a"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isVideo ? "#0a0a1a" : "#1a0505",
          border: `1px solid ${isVideo ? "rgba(99,102,241,0.25)" : "rgba(178,34,34,0.25)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "1rem",
        }}
      >
        {isVideo ? "▶" : "💪"}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          className="font-body"
          style={{
            fontWeight: 700,
            fontSize: "0.88rem",
            color: "#F5F5F0",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nom}
        </p>
        {duree && (
          <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", margin: "2px 0 0" }}>
            {duree} min
          </p>
        )}
      </div>
      {isToday && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#B22222",
            backgroundColor: "rgba(178,34,34,0.12)",
            padding: "3px 8px",
            borderRadius: 6,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          AUJOURD&apos;HUI
        </span>
      )}
    </div>
  );
}

function JourSection({ jourIndex, items, isToday }: { jourIndex: number; items: CellItem[]; isToday: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          className="font-body"
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: isToday ? "#B22222" : "#444",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {JOURS_FULL[jourIndex - 1]}
        </span>
        {isToday && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#B22222", display: "inline-block" }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <SeanceCard key={item._key} item={item} isToday={isToday} />
        ))}
      </div>
    </div>
  );
}

export default function EntrainementClient({ programme }: { programme: Programme | null }) {
  const [semaine, setSemaine] = useState(programme?.semaine_courante ?? 1);
  const todayJ = getTodayJourIndex();

  if (!programme) {
    return (
      <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            backgroundColor: "#111111",
            border: "1px solid #1a1a1a",
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🏋️</div>
          <h2
            className="font-title"
            style={{ fontSize: "1.3rem", color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 10px" }}
          >
            AUCUN PROGRAMME ACTIF
          </h2>
          <p className="font-body" style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6, margin: 0 }}>
            Ton coach n&apos;a pas encore assigné de programme d&apos;entraînement.
            <br />
            Reviens bientôt !
          </p>
        </div>
      </div>
    );
  }

  const { nom, niveau, duree_semaines, grid } = programme;

  // Collecter les jours qui ont des items cette semaine
  const joursDeLaSemaine: { jourIndex: number; items: CellItem[] }[] = [];
  for (let j = 1; j <= 7; j++) {
    const key = `S${semaine}_J${j}`;
    const items = (grid[key] ?? []) as CellItem[];
    if (items.length > 0) {
      joursDeLaSemaine.push({ jourIndex: j, items });
    }
  }

  // Trouver si aujourd'hui est dans cette semaine ET a des séances
  const todayHasSeances = joursDeLaSemaine.some((d) => d.jourIndex === todayJ);

  return (
    <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto" }}>

      {/* Carte programme */}
      <div
        style={{
          background: "linear-gradient(160deg, #8B0000 0%, #B22222 100%)",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 16,
        }}
      >
        <p className="font-body" style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", margin: "0 0 4px" }}>
          PROGRAMME EN COURS {niveau ? `· ${getNiveauLabel(niveau).toUpperCase()}` : ""}
        </p>
        <h2 className="font-title" style={{ fontSize: "1.5rem", color: "#FFFFFF", letterSpacing: "0.04em", margin: "0 0 12px", lineHeight: 1 }}>
          {nom.toUpperCase()}
        </h2>

        {/* Barre progression semaines */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            Semaine {programme.semaine_courante} / {duree_semaines}
          </span>
          <span className="font-body" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
            {Math.round((programme.semaine_courante / duree_semaines) * 100)}%
          </span>
        </div>
        <div style={{ height: 4, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(programme.semaine_courante / duree_semaines) * 100}%`,
              backgroundColor: "#FFFFFF",
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* Navigation semaine */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          onClick={() => setSemaine((s) => Math.max(1, s - 1))}
          disabled={semaine <= 1}
          style={{
            background: "none",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: semaine <= 1 ? "not-allowed" : "pointer",
            opacity: semaine <= 1 ? 0.3 : 1,
            color: "#F5F5F0",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ textAlign: "center" }}>
          <p className="font-title" style={{ fontSize: "1.2rem", color: "#F5F5F0", letterSpacing: "0.06em", margin: 0 }}>
            SEMAINE {semaine}
          </p>
          {semaine === programme.semaine_courante && (
            <p className="font-body" style={{ fontSize: "0.65rem", color: "#B22222", fontWeight: 700, margin: "2px 0 0", letterSpacing: "0.06em" }}>
              SEMAINE EN COURS
            </p>
          )}
        </div>

        <button
          onClick={() => setSemaine((s) => Math.min(duree_semaines, s + 1))}
          disabled={semaine >= duree_semaines}
          style={{
            background: "none",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: semaine >= duree_semaines ? "not-allowed" : "pointer",
            opacity: semaine >= duree_semaines ? 0.3 : 1,
            color: "#F5F5F0",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Mini calendrier jours */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {JOURS.map((jour, i) => {
          const j = i + 1;
          const hasSeance = joursDeLaSemaine.some((d) => d.jourIndex === j);
          const isToday = j === todayJ && semaine === programme.semaine_courante;
          return (
            <div
              key={j}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                borderRadius: 8,
                backgroundColor: isToday ? "#B22222" : hasSeance ? "#1a1a1a" : "transparent",
                border: isToday ? "none" : hasSeance ? "1px solid #2a2a2a" : "1px solid transparent",
              }}
            >
              <p
                className="font-body"
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: isToday ? "#fff" : hasSeance ? "#F5F5F0" : "#333",
                  margin: "0 0 4px",
                  letterSpacing: "0.04em",
                }}
              >
                {jour}
              </p>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: hasSeance ? (isToday ? "#fff" : "#B22222") : "transparent",
                  margin: "0 auto",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Séances de la semaine */}
      {joursDeLaSemaine.length === 0 ? (
        <div
          style={{
            backgroundColor: "#111111",
            border: "1px solid #1a1a1a",
            borderRadius: 14,
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <p className="font-body" style={{ fontSize: "0.82rem", color: "#444", margin: 0 }}>
            Aucune séance planifiée cette semaine
          </p>
        </div>
      ) : (
        joursDeLaSemaine.map(({ jourIndex, items }) => (
          <JourSection
            key={jourIndex}
            jourIndex={jourIndex}
            items={items}
            isToday={jourIndex === todayJ && semaine === programme.semaine_courante && todayHasSeances}
          />
        ))
      )}

    </div>
  );
}
