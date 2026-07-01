"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { youtubeEmbedUrl } from "@/lib/youtube";

interface Video {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  doc_url: string | null;
  doc_name: string | null;
  watched: boolean;
}

export default function VideoWatchClient({ video }: { video: Video }) {
  const router = useRouter();
  const [watched, setWatched] = useState(video.watched);
  const [saving, setSaving] = useState(false);
  const embed = youtubeEmbedUrl(video.lien_youtube);

  async function handleMarkWatched() {
    setSaving(true);
    try {
      await fetch("/api/tts/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: video.id }),
      });
      setWatched(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <button onClick={() => router.push("/tts-app/parcours")} className="font-body" style={{ background: "none", border: "none", color: "#8A8078", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        ‹ Retour
      </button>

      <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        {embed ? (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src={embed}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <a href={video.lien_youtube} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6" }}>{video.lien_youtube}</a>
        )}
      </div>

      <h1 className="font-body" style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{video.titre}</h1>
      {video.description && <p className="font-body" style={{ color: "#8A8078", fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>{video.description}</p>}
      {video.doc_url && (
        <a href={video.doc_url} target="_blank" rel="noopener noreferrer" className="font-body" style={{ display: "block", color: "#D97706", fontSize: 13, marginBottom: 14 }}>
          📄 {video.doc_name}
        </a>
      )}

      <button
        onClick={handleMarkWatched}
        disabled={watched || saving}
        className="font-body"
        style={{
          width: "100%", padding: "13px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700,
          backgroundColor: watched ? "#1A1414" : "#B22222", color: watched ? "#4ADE80" : "#fff",
          cursor: watched ? "default" : "pointer", marginBottom: 20,
        }}
      >
        {watched ? "✅ Vidéo terminée" : saving ? "..." : "Marquer comme vue"}
      </button>
    </div>
  );
}
