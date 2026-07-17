"use client";

import { useState } from "react";

function extractId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export default function YoutubeTestimonial({
  prenom,
  youtubeUrl,
  featured,
}: {
  prenom: string;
  youtubeUrl: string;
  featured?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const id = extractId(youtubeUrl);

  return (
    <div className={"tts-testi-card" + (featured ? " tts-testi-featured" : "")}>
      <div className="tts-testi-video">
        {playing && id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={"Témoignage de " + prenom}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <button
            className="tts-testi-play-trigger"
            onClick={() => setPlaying(true)}
            aria-label={"Lire le témoignage de " + prenom}
          >
            {id && (
              <img
                src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
              />
            )}
            <span className="tts-ph-tag">Vidéo</span>
            <div className="tts-play-btn">
              <svg viewBox="0 0 24 24" fill="var(--blanc)">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>
      <div className="tts-testi-body">
        <p className="tts-testi-name font-title">{prenom}</p>
        <p className="tts-testi-source">Cliente Time To Move</p>
      </div>
    </div>
  );
}
