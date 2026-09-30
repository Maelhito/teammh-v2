"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TtlVideoModal from "@/components/TtlVideoModal";
import TtlCelebration from "@/components/TtlCelebration";
import { ttlColors } from "@/lib/ttl-theme";
import { youtubeVideoId } from "@/lib/youtube";

interface Video {
  id: string;
  titre: string;
  lien_youtube: string;
  cover_url: string | null;
  description: string | null;
  doc_url: string | null;
  doc_name: string | null;
  watched: boolean;
}

interface Props {
  videos: Video[];
  /** le questionnaire du module reste à remplir : les vidéos vues ne suffisent pas à le terminer */
  resteQuestionnaire?: boolean;
  /** dernière étape du chemin, après les vidéos (le questionnaire du module 1) */
  etapeFinale?: { faite: boolean; contenu: React.ReactNode };
}

/**
 * Petite couverture verticale. Pour un Short sans couverture téléversée, on
 * prend l'image verticale de YouTube (oar2) ; si elle n'existe pas, repli sur
 * l'image classique (recadrée au centre).
 */
function Couverture({ video }: { video: Video }) {
  const id = youtubeVideoId(video.lien_youtube);
  const estShort = video.lien_youtube.includes("/shorts/");
  const couvertureYoutube = !!video.cover_url?.includes("i.ytimg.com");
  const vertical = estShort && couvertureYoutube && !!id;
  const [src, setSrc] = useState(vertical ? `https://i.ytimg.com/vi/${id}/oar2.jpg` : video.cover_url);
  const [enVertical, setEnVertical] = useState(vertical);

  return (
    <div style={{ position: "relative", width: 84, aspectRatio: "4 / 5", flexShrink: 0, borderRadius: 10, background: "#1a1414", overflow: "hidden" }}>
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => {
            if (enVertical && video.cover_url) {
              setEnVertical(false);
              setSrc(video.cover_url);
            } else setSrc(null);
          }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.92 }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 11, marginLeft: 2 }}>▶</span>
        </div>
      </div>
    </div>
  );
}

export default function TtlModuleVideos({ videos, resteQuestionnaire = false, etapeFinale }: Props) {
  const router = useRouter();
  const [watchedIds, setWatchedIds] = useState(new Set(videos.filter((v) => v.watched).map((v) => v.id)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  const openVideo = videos.find((v) => v.id === openId) ?? null;
  const allWatchedAfter = (videoId: string) => videos.every((v) => v.id === videoId || watchedIds.has(v.id));

  async function markWatched(videoId: string) {
    const res = await fetch("/api/ttl/videos/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    if (res.ok) {
      const moduleDone = allWatchedAfter(videoId) && !resteQuestionnaire;
      setWatchedIds((prev) => new Set(prev).add(videoId));
      setCelebration(moduleDone ? "Module terminé !" : "Vidéo validée !");
      router.refresh();
    }
  }

  if (videos.length === 0 && !etapeFinale) {
    return (
      <p className="font-body" style={{ fontSize: "0.8rem", color: ttlColors.muted, padding: "0 4px" }}>
        Aucune vidéo pour l&apos;instant.
      </p>
    );
  }

  const etapes: { cle: string; faite: boolean; contenu: React.ReactNode }[] = videos.map((v, i) => {
    const watched = watchedIds.has(v.id);
    return {
      cle: v.id,
      faite: watched,
      contenu: (
        <button
          onClick={() => setOpenId(v.id)}
          aria-label={`Regarder : ${v.titre}`}
          style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", cursor: "pointer", background: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 12, fontFamily: "inherit" }}
        >
          <Couverture video={v} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="font-body" style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: ttlColors.redBright }}>
              VIDÉO {i + 1}{watched ? " · VUE ✓" : ""}
            </p>
            <p className="font-body" style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: ttlColors.offWhite, lineHeight: 1.3 }}>
              {v.titre}
            </p>
            <p className="font-body" style={{ margin: "8px 0 0", fontSize: 12, color: ttlColors.muted }}>
              {watched ? "La revoir" : "Regarder"} ›
            </p>
          </div>
        </button>
      ),
    };
  });
  if (etapeFinale) etapes.push({ cle: "finale", faite: etapeFinale.faite, contenu: etapeFinale.contenu });

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 12 }}>
        {etapes.map((e) => (
          <div key={e.cle}>
            {e.contenu}
          </div>
        ))}
      </div>

      {openVideo && (
        <TtlVideoModal
          titre={openVideo.titre}
          lien_youtube={openVideo.lien_youtube}
          description={openVideo.description}
          docUrl={openVideo.doc_url}
          docName={openVideo.doc_name}
          watched={watchedIds.has(openVideo.id)}
          onMarkWatched={() => markWatched(openVideo.id)}
          onClose={() => setOpenId(null)}
        />
      )}

      {celebration && (
        <TtlCelebration message={celebration} emoji={celebration.includes("Module") ? "🎓" : "✅"} onDone={() => setCelebration(null)} />
      )}
    </>
  );
}
