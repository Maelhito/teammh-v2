"use client";

import { useState, useEffect } from "react";

interface Replay {
  id: string;
  categorie: string;
  video_url: string;
  titre: string | null;
  created_at: string;
}

const CATEGORIES = [
  { key: "boost_mental",      label: "🧠 Boost Mental" },
  { key: "visio_sport",       label: "💪 Visio Sport" },
  { key: "visio_stretching",  label: "🧘 Visio Stretching" },
] as const;

function youtubeEmbed(url: string): string {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

function AccordionSection({ category, replays }: { category: typeof CATEGORIES[number]; replays: Replay[] }) {
  const [open, setOpen] = useState(false);
  const sectionReplays = replays.filter((r) => r.categorie === category.key);

  return (
    <div style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden", border: "1px solid #1a1a1a" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "#111111",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.03em" }}>
          {category.label}
          {sectionReplays.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#555", fontWeight: 400 }}>
              {sectionReplays.length} vidéo{sectionReplays.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#555", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ backgroundColor: "#0D0D0D", padding: "12px 16px 16px" }}>
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
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
                  <iframe
                    src={youtubeEmbed(replay.video_url)}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function VisioReplaysClient() {
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
      {CATEGORIES.map((cat) => (
        <AccordionSection key={cat.key} category={cat} replays={replays} />
      ))}
    </div>
  );
}
