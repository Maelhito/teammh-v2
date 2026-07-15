"use client";

import { useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { ttsColors } from "@/lib/tts-theme";

interface Props {
  titre: string;
  lien_youtube: string;
  description?: string | null;
  materiel?: string[];
  docUrl?: string | null;
  docName?: string | null;
  watched?: boolean;
  onMarkWatched?: () => Promise<void>;
  onClose: () => void;
}

export default function TtsVideoModal({
  titre,
  lien_youtube,
  description,
  materiel,
  docUrl,
  docName,
  watched,
  onMarkWatched,
  onClose,
}: Props) {
  const [marking, setMarking] = useState(false);
  const [isWatched, setIsWatched] = useState(!!watched);
  const embed = youtubeEmbedUrl(lien_youtube);

  async function handleMark() {
    if (!onMarkWatched || marking) return;
    setMarking(true);
    try {
      await onMarkWatched();
      setIsWatched(true);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <p className="font-body" style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{titre}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: ttsColors.muted, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        {embed ? (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
            <iframe
              src={embed}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <a href={lien_youtube} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", fontSize: 13 }}>{lien_youtube}</a>
        )}

        {description && (
          <p className="font-body" style={{ marginTop: 14, fontSize: "0.82rem", color: "rgba(245,245,240,0.75)", lineHeight: 1.5 }}>{description}</p>
        )}

        {materiel && materiel.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {materiel.map((m, i) => (
              <span key={i} className="font-body" style={{ fontSize: "0.7rem", color: "#F5F5F0", backgroundColor: ttsColors.bg, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 20, padding: "4px 10px" }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body"
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "10px 14px", backgroundColor: ttsColors.bg, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 10, color: "#3B82F6", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}
          >
            ↓ {docName || "Télécharger le document"}
          </a>
        )}

        {onMarkWatched && (
          isWatched ? (
            <div
              className="font-body"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: "12px 0", backgroundColor: ttsColors.bg, border: "1px solid rgba(230,57,70,0.35)", borderRadius: 12, color: ttsColors.redBright, fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.04em" }}
            >
              ✓ VIDÉO VUE
            </div>
          ) : (
            <button
              onClick={handleMark}
              disabled={marking}
              className="font-body"
              style={{ width: "100%", marginTop: 16, padding: "12px 0", backgroundColor: marking ? ttsColors.cardBorder : ttsColors.red, border: "none", borderRadius: 12, color: "#FFF", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.04em", cursor: marking ? "not-allowed" : "pointer" }}
            >
              {marking ? "..." : "✓ Marquer comme vue"}
            </button>
          )
        )}
      </div>
    </div>
  );
}
