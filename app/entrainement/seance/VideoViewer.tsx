"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { youtubeEmbedUrl } from "@/lib/youtube";
import FinDeSeance, { type PalierAtteint } from "@/components/FinDeSeance";

/**
 * Une séance en vidéo : la cliente lance le lecteur dans l'app, s'entraîne
 * avec, puis valide. Exactement le même aboutissement qu'une séance
 * construite — `/api/entrainement/terminer`, donc la semaine se compte et la
 * flamme tient.
 *
 * Avant, une case « vidéo » n'était lançable nulle part : l'accueil affichait
 * « repos », l'écran Séances aussi, et seul le calendrier proposait un lien
 * vers YouTube — hors de l'app, donc jamais validé.
 */
export default function VideoViewer({
  assignmentId,
  gridKey,
  titre,
  url,
  nomProgramme,
}: {
  assignmentId: string;
  gridKey: string;
  titre: string;
  url: string;
  nomProgramme: string;
}) {
  const router = useRouter();
  const startTimeRef = useRef<number>(Date.now());

  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [serieResult, setSerieResult] = useState<number | null>(null);
  const [palierAtteint, setPalierAtteint] = useState<PalierAtteint | null>(null);
  const [programmeTermine, setProgrammeTermine] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const embed = youtubeEmbedUrl(url);

  async function finirSeance() {
    setFinishing(true);
    setElapsedMin(Math.round((Date.now() - startTimeRef.current) / 60000));
    try {
      const res = await fetch("/api/entrainement/terminer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, gridKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.serie === "number") setSerieResult(data.serie);
      if (data.palierAtteint) setPalierAtteint(data.palierAtteint);
      if (data.programmeTermine) setProgrammeTermine(true);
      if (typeof data.logId === "string") setLogId(data.logId);
    } catch {}
    setDone(true);
    setFinishing(false);
  }

  if (done) {
    return (
      <FinDeSeance
        titre={titre}
        elapsedMin={elapsedMin}
        serie={serieResult}
        palierAtteint={palierAtteint}
        programmeTermine={programmeTermine}
        logId={logId}
      />
    );
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 40 }}>
      {/* En-tête */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 0" }}>
        <button
          onClick={() => router.push("/entrainement")}
          style={{ background: "none", border: "none", color: "#666", fontSize: "0.8rem", cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Mes séances
        </button>

        {nomProgramme && (
          <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.1em", margin: "0 0 4px" }}>
            {nomProgramme.toUpperCase()}
          </p>
        )}
        <h1 className="font-title" style={{ fontSize: "1.5rem", color: "#F5F5F0", letterSpacing: "0.04em", margin: "0 0 16px", lineHeight: 1.2 }}>
          {titre}
        </h1>
      </div>

      {/* Lecteur */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
        {embed ? (
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", backgroundColor: "#000", borderRadius: 14, overflow: "hidden" }}>
            <iframe
              src={embed}
              title={titre}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          // Lien non reconnu comme YouTube : on ne laisse pas la cliente devant
          // un cadre vide, elle garde un accès direct.
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
            <p className="font-body" style={{ fontSize: "0.85rem", color: "#F5F5F0", margin: "0 0 12px" }}>
              La vidéo s&apos;ouvre dans un nouvel onglet.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "10px 18px", backgroundColor: "#B22222", color: "#FFF", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}
            >
              ▶ Ouvrir la vidéo
            </a>
          </div>
        )}

        <p className="font-body" style={{ fontSize: "0.75rem", color: "#555", margin: "14px 0 0", lineHeight: 1.5 }}>
          Suis la vidéo du début à la fin, puis valide ta séance ci-dessous — elle
          comptera dans ta semaine et dans ta flamme. 🔥
        </p>

        <button
          onClick={finirSeance}
          disabled={finishing}
          style={{
            width: "100%", marginTop: 20, padding: "16px",
            background: finishing ? "#333" : "linear-gradient(135deg, #8B0000 0%, #B22222 100%)",
            color: "#FFFFFF", border: "none", borderRadius: 14,
            fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.05em",
            cursor: finishing ? "not-allowed" : "pointer",
          }}
        >
          {finishing ? "Validation…" : "✓ J'AI TERMINÉ MA SÉANCE"}
        </button>
      </div>
    </div>
  );
}
