"use client";

import { useState } from "react";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";
import { VideoLibraryCard, RecipeLibraryCard } from "../TtsShared";

interface SportVideo {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  materiel: string[] | null;
  cover_url: string | null;
  numero_mois: number;
  programme_titre: string | null;
}

interface Recette {
  id: string;
  titre: string;
  photo_url: string | null;
  texte: string | null;
  ingredients: string | null;
  macros: { calories?: number; proteines?: number; glucides?: number; lipides?: number } | null;
}

export default function BibliothequeClient({ sportVideos, recettes }: { sportVideos: SportVideo[]; recettes: Recette[] }) {
  const [tab, setTab] = useState<"seances" | "recettes">("seances");
  const [previewVideo, setPreviewVideo] = useState<SportVideo | null>(null);
  const [previewRecette, setPreviewRecette] = useState<Recette | null>(null);

  return (
    <div style={{ padding: "24px 20px 0" }}>
      <h1 className="font-body" style={{ color: "#F5F5F0", fontSize: 15, fontWeight: 700, margin: 0 }}>Bibliothèque</h1>
      <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: "4px 0 16px" }}>Séances · Recettes</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["seances", "recettes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-body"
            style={{
              backgroundColor: tab === t ? "#B22222" : "#1A1414", border: `1px solid ${tab === t ? "#B22222" : "#2A2020"}`,
              color: tab === t ? "#fff" : "#8A8078", fontSize: 12, padding: "7px 14px", borderRadius: 20,
              fontWeight: tab === t ? 700 : 400, cursor: "pointer",
            }}
          >
            {t === "seances" ? "Séances" : "Recettes"}
          </button>
        ))}
      </div>

      {tab === "seances" && (
        <div>
          {sportVideos.map((v) => (
            <VideoLibraryCard
              key={v.id}
              titre={v.titre}
              meta={`Mois ${v.numero_mois}${v.materiel?.length ? " · " + v.materiel.join(", ") : ""}`}
              coverUrl={v.cover_url ?? youtubeThumbnail(v.lien_youtube)}
              onClick={() => setPreviewVideo(v)}
            />
          ))}
          {sportVideos.length === 0 && <p className="font-body" style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>Aucune séance disponible pour l&apos;instant.</p>}
        </div>
      )}

      {tab === "recettes" && (
        <div>
          {recettes.map((r) => (
            <RecipeLibraryCard key={r.id} titre={r.titre} meta="Recette" photoUrl={r.photo_url} onClick={() => setPreviewRecette(r)} />
          ))}
          {recettes.length === 0 && <p className="font-body" style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>Aucune recette disponible pour l&apos;instant.</p>}
        </div>
      )}

      {previewVideo && (
        <VideoModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
      {previewRecette && (
        <RecetteModal recette={previewRecette} onClose={() => setPreviewRecette(null)} />
      )}
    </div>
  );
}

function VideoModal({ video, onClose }: { video: SportVideo; onClose: () => void }) {
  const embed = youtubeEmbedUrl(video.lien_youtube, true);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 16, padding: 16, maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="font-body" style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>{video.titre}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A8078", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {embed ? (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
            <iframe src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} />
          </div>
        ) : (
          <a href={video.lien_youtube} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6" }}>{video.lien_youtube}</a>
        )}
        {video.description && <p className="font-body" style={{ color: "#8A8078", fontSize: 13, marginTop: 12 }}>{video.description}</p>}
        {!!video.materiel?.length && <p className="font-body" style={{ color: "#8A8078", fontSize: 12, marginTop: 8 }}>🧰 {video.materiel.join(", ")}</p>}
      </div>
    </div>
  );
}

function RecetteModal({ recette, onClose }: { recette: Recette; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 16, padding: 16, maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="font-body" style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0 }}>{recette.titre}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A8078", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {recette.photo_url && <img src={recette.photo_url} alt={recette.titre} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />}
        {recette.texte && <p className="font-body" style={{ color: "#F5F5F0", fontSize: 13, marginBottom: 12 }}>{recette.texte}</p>}
        {recette.ingredients && <pre className="font-body" style={{ color: "#8A8078", fontSize: 12, whiteSpace: "pre-wrap", margin: "0 0 12px" }}>{recette.ingredients}</pre>}
        {recette.macros && (
          <p className="font-body" style={{ color: "#8A8078", fontSize: 12, fontWeight: 700 }}>
            {recette.macros.calories ? `${recette.macros.calories} kcal` : ""}{recette.macros.proteines ? ` · P ${recette.macros.proteines}g` : ""}{recette.macros.glucides ? ` · G ${recette.macros.glucides}g` : ""}{recette.macros.lipides ? ` · L ${recette.macros.lipides}g` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
