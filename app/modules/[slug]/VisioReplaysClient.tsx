"use client";

import { useEffect, useState } from "react";

interface Replay {
  id: string;
  categorie: string;
  video_url: string;
  titre: string | null;
  created_at: string;
}

const CATEGORIES_BY_MODULE: Record<string, ReadonlyArray<{ key: string; label: string }>> = {
  "module-8": [
    { key: "boost_mental", label: "💬 Tes interrogations du Quotidien" },
  ],
  "module-9": [
    { key: "visio_stretching", label: "🧘 Séances Mobilité" },
  ],
};

function youtubeEmbed(url: string): string {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url) || url.includes("/storage/v1/object/public/visio-videos/");
}

function VideoSection({ category, replays }: { category: { key: string; label: string }; replays: Replay[] }) {
  const sectionReplays = replays.filter((r) => r.categorie === category.key);

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.03em", marginBottom: 12 }}>
        {category.label}
      </p>

      {sectionReplays.length === 0 ? (
        <p style={{ color: "#555", fontSize: "0.82rem", textAlign: "center", margin: "12px 0" }}>
          Aucune vidéo disponible pour le moment
        </p>
      ) : (
        sectionReplays.map((replay) => (
          <div key={replay.id} style={{ marginBottom: 16 }}>
            {replay.titre && (
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
                {replay.titre}
              </p>
            )}
            {isVideoFile(replay.video_url) ? (
              <video
                controls
                preload="metadata"
                style={{ width: "100%", borderRadius: 10, backgroundColor: "#000", display: "block" }}
              >
                <source src={replay.video_url} type="video/mp4" />
                Ton navigateur ne supporte pas la lecture vidéo.
              </video>
            ) : (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
                <iframe
                  src={youtubeEmbed(replay.video_url)}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function VisioReplaysClient({ moduleSlug }: { moduleSlug: string }) {
  const categories = CATEGORIES_BY_MODULE[moduleSlug] ?? [];
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/visio-replays")
      .then((r) => r.json())
      .then((d) => setReplays(d.replays ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: "#555", fontSize: "0.82rem", textAlign: "center", padding: 24 }}>Chargement…</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      {categories.map((cat) => (
        <VideoSection key={cat.key} category={cat} replays={replays} />
      ))}
    </div>
  );
}
