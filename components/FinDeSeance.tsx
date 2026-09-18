"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * L'écran de fin, commun à TOUTES les séances : blocs à enchaîner comme vidéo
 * à suivre. Une vidéo se valide exactement comme une séance construite — même
 * trophée, même flamme, même note. Sans ce partage, le jour « vidéo » aurait
 * de nouveau fini en citoyen de seconde zone.
 */

export interface PalierAtteint {
  emoji: string;
  label: string;
}

interface Props {
  /** Nom affiché sous le trophée */
  titre: string;
  /** Durée réelle de la séance, en minutes (0 = on n'affiche rien) */
  elapsedMin: number;
  /** Nombre d'exercices enchaînés (0 = on n'affiche rien, cas de la vidéo) */
  totalExercices?: number;
  /** Série renvoyée par l'API après validation */
  serie: number | null;
  palierAtteint: PalierAtteint | null;
  programmeTermine: boolean;
  /** Ligne `seances_log` créée à la validation — sans elle, pas de note à noter */
  logId: string | null;
}

export default function FinDeSeance({
  titre,
  elapsedMin,
  totalExercices = 0,
  serie,
  palierAtteint,
  programmeTermine,
  logId,
}: Props) {
  const router = useRouter();
  const [noteEtoiles, setNoteEtoiles] = useState(0);
  const [noteTexte, setNoteTexte] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  async function sauvegarderNote() {
    if (!logId) { router.push("/entrainement"); return; }
    setNoteSaving(true);
    try {
      await fetch("/api/entrainement/noter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, note_etoiles: noteEtoiles || null, note_texte: noteTexte, duration_min: elapsedMin || null }),
      });
    } catch {}
    setNoteSaved(true);
    setNoteSaving(false);
    router.push("/entrainement");
  }

  const messages = [
    "Tu t'es surpassée aujourd'hui. 💪",
    "Chaque séance te rapproche de ton objectif. 🎯",
    "La régularité fait toute la différence. 🔥",
    "Fierté garantie. Tu l'as mérité. ⚡",
    "Corps et mental : tu progresses sur les deux. 🏆",
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const confettiColors = ["#B22222", "#FB923C", "#FBBF24", "#4ADE80", "#3B82F6", "#A78BFA"];
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    color: confettiColors[i % confettiColors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative" }}>
      {/* Confettis CSS */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {confettiPieces.map((p, i) => (
        <div key={i} style={{
          position: "fixed", top: 0, left: p.left,
          width: p.size, height: p.size,
          backgroundColor: p.color, borderRadius: "2px",
          animation: `confettiFall 2.5s ${p.delay} ease-in forwards`,
          pointerEvents: "none", zIndex: 0,
        }} />
      ))}

      <div style={{ textAlign: "center", maxWidth: 360, position: "relative", zIndex: 1 }}>
        {/* Trophée */}
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>🏆</div>

        <h1 className="font-title" style={{ fontSize: "2rem", color: "#FFFFFF", letterSpacing: "0.06em", margin: "0 0 6px" }}>
          SÉANCE TERMINÉE
        </h1>
        <p className="font-body" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 24px" }}>
          {titre.toUpperCase()}
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "center" }}>
          {elapsedMin > 0 && (
            <div style={{ flex: 1, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <p className="font-title" style={{ fontSize: "1.5rem", color: "#FFFFFF", margin: 0, lineHeight: 1 }}>{elapsedMin}</p>
              <p className="font-body" style={{ fontSize: "0.65rem", color: "#FFFFFF", margin: "4px 0 0", letterSpacing: "0.06em" }}>MIN</p>
            </div>
          )}
          {totalExercices > 0 && (
            <div style={{ flex: 1, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <p className="font-title" style={{ fontSize: "1.5rem", color: "#FFFFFF", margin: 0, lineHeight: 1 }}>{totalExercices}</p>
              <p className="font-body" style={{ fontSize: "0.65rem", color: "#FFFFFF", margin: "4px 0 0", letterSpacing: "0.06em" }}>EXERCICES</p>
            </div>
          )}
          {serie !== null && serie > 0 && (
            <div style={{ flex: 1, backgroundColor: "#1a0000", border: "1px solid rgba(178,34,34,0.4)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <p className="font-title" style={{ fontSize: "1.5rem", color: "#FFFFFF", margin: 0, lineHeight: 1 }}>🔥{serie}</p>
              <p className="font-body" style={{ fontSize: "0.65rem", color: "#FFFFFF", margin: "4px 0 0", letterSpacing: "0.06em", opacity: 0.7 }}>SÉRIE</p>
            </div>
          )}
        </div>

        {/* Dernière séance du programme : il vient de se clore tout seul */}
        {programmeTermine && (
          <div style={{ backgroundColor: "rgba(178,34,34,0.14)", border: "1px solid rgba(178,34,34,0.45)", borderRadius: 12, padding: "12px 14px", margin: "0 0 20px" }}>
            <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.08em", margin: 0, opacity: 0.6 }}>
              PROGRAMME TERMINÉ
            </p>
            <p className="font-body" style={{ fontSize: "1rem", fontWeight: 700, color: "#FFFFFF", margin: "3px 0 0" }}>
              🎉 Toutes les séances sont validées
            </p>
          </div>
        )}

        {/* Palier décroché : c'est le moment où elle vient de le gagner */}
        {palierAtteint && (
          <div style={{ backgroundColor: "rgba(178,34,34,0.14)", border: "1px solid rgba(178,34,34,0.45)", borderRadius: 12, padding: "12px 14px", margin: "0 0 20px" }}>
            <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.08em", margin: 0, opacity: 0.6 }}>
              PALIER DÉBLOQUÉ
            </p>
            <p className="font-body" style={{ fontSize: "1rem", fontWeight: 700, color: "#FFFFFF", margin: "3px 0 0" }}>
              {palierAtteint.emoji} {palierAtteint.label}
            </p>
          </div>
        )}

        {/* Message motivant */}
        <p className="font-body" style={{ fontSize: "0.88rem", color: "#FFFFFF", margin: "0 0 28px", lineHeight: 1.6, fontStyle: "italic" }}>
          {msg}
        </p>

        {/* Note séance */}
        {!noteSaved && (
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "20px 16px", marginBottom: 20, textAlign: "left" }}>
            <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.1em", margin: "0 0 12px", textAlign: "center" }}>
              COMMENT S&apos;EST PASSÉE CETTE SÉANCE ?
            </p>

            {/* Étoiles */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNoteEtoiles(n === noteEtoiles ? 0 : n)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: "1.8rem", lineHeight: 1, filter: n <= noteEtoiles ? "none" : "grayscale(1) opacity(0.45)", transition: "filter 0.15s, transform 0.1s", transform: n <= noteEtoiles ? "scale(1.1)" : "scale(1)" }}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* Zone de texte */}
            <textarea
              value={noteTexte}
              onChange={(e) => setNoteTexte(e.target.value)}
              className="seance-note"
              placeholder="Ajoute une note (points durs, ressenti, charge…)"
              style={{ width: "100%", minHeight: 80, backgroundColor: "#0D0D0D", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", fontSize: "0.85rem", color: "#FFFFFF", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }}
            />

            <button
              onClick={sauvegarderNote}
              disabled={noteSaving}
              style={{ width: "100%", marginTop: 12, padding: "13px", backgroundColor: noteSaving ? "#333" : "#B22222", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, cursor: noteSaving ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
            >
              {noteSaving ? "Enregistrement…" : "SAUVEGARDER & CONTINUER →"}
            </button>

            <button
              onClick={() => router.push("/entrainement")}
              style={{ width: "100%", marginTop: 8, padding: "10px", backgroundColor: "transparent", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: "0.8rem", cursor: "pointer" }}
            >
              Passer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
