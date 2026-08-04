"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TtlVideoModal from "@/components/TtlVideoModal";
import TtlCelebration from "@/components/TtlCelebration";
import { ttlColors } from "@/lib/ttl-theme";

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

export default function TtlModuleVideos({ videos }: { videos: Video[] }) {
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
      const moduleDone = allWatchedAfter(videoId);
      setWatchedIds((prev) => new Set(prev).add(videoId));
      setCelebration(moduleDone ? "Module terminé !" : "Vidéo validée !");
      router.refresh();
    }
  }

  if (videos.length === 0) {
    return (
      <p className="font-body" style={{ fontSize: "0.8rem", color: ttlColors.muted, padding: "0 4px" }}>
        Aucune vidéo pour l&apos;instant.
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 16 }}>
        {videos.map((v, i) => {
          const watched = watchedIds.has(v.id);
          return (
            <button
              key={v.id}
              onClick={() => setOpenId(v.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                backgroundColor: ttlColors.card,
                border: `1px solid ${watched ? "rgba(230,57,70,0.35)" : ttlColors.cardBorder}`,
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: 12, flexShrink: 0,
                background: v.cover_url ? undefined : "linear-gradient(135deg,#B22222,#5a1010)",
                backgroundImage: v.cover_url ? `url(${v.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {!v.cover_url && <span style={{ fontSize: 20 }}>▶</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-body" style={{ margin: "0 0 3px", fontWeight: 600, fontSize: "14.5px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {i + 1}. {v.titre}
                </p>
                <p className="font-body" style={{ margin: 0, fontSize: 12, color: ttlColors.muted }}>
                  {watched ? "Vue" : "À regarder"}
                </p>
              </div>
              <span style={{ fontSize: "1rem", flexShrink: 0, color: watched ? ttlColors.redBright : ttlColors.muted }}>
                {watched ? "✓" : "›"}
              </span>
            </button>
          );
        })}
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
