"use client";

import { useEffect, useRef, useState } from "react";
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
 * Couverture d'une vidéo en grand. Pour un Short sans couverture téléversée,
 * on prend l'image verticale de YouTube (oar2) — l'image classique est un
 * cadre horizontal avec de grandes bandes noires ; si elle n'existe pas, repli
 * sur l'image classique.
 */
function Couverture({ video }: { video: Video }) {
  const id = youtubeVideoId(video.lien_youtube);
  const estShort = video.lien_youtube.includes("/shorts/");
  const couvertureYoutube = !!video.cover_url?.includes("i.ytimg.com");
  const vertical = estShort && couvertureYoutube && !!id;
  const [src, setSrc] = useState(vertical ? `https://i.ytimg.com/vi/${id}/oar2.jpg` : video.cover_url);
  const [enVertical, setEnVertical] = useState(vertical);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: enVertical ? "4 / 5" : "16 / 9", background: "linear-gradient(135deg,#B22222,#3a0a0a)", overflow: "hidden" }}>
      {src && (
        <img
          src={src}
          alt={video.titre}
          loading="lazy"
          onError={() => {
            if (enVertical && video.cover_url) {
              setEnVertical(false);
              setSrc(video.cover_url);
            } else setSrc(null);
          }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: ttlColors.red, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#fff", fontSize: 24, marginLeft: 4 }}>▶</span>
        </div>
      </div>
      {video.watched && (
        <span className="font-body" style={{ position: "absolute", top: 12, right: 12, background: ttlColors.red, color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 20 }}>
          ✓ Vue
        </span>
      )}
    </div>
  );
}

/**
 * Suivi du chemin, collé sous le logo : une pastille par étape, reliées par une
 * ligne rouge qui avance à mesure qu'on descend dans la page.
 */
function Suivi({ total, progression, atteintes, faites }: { total: number; progression: number; atteintes: boolean[]; faites: boolean[] }) {
  return (
    <div style={{ position: "sticky", top: 100, zIndex: 40, background: ttlColors.bg, padding: "8px 4px 10px" }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", height: 26 }}>
        <div style={{ position: "absolute", left: 13, right: 13, top: "50%", height: 3, marginTop: -1.5, background: ttlColors.cardBorder, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: 13, top: "50%", height: 3, marginTop: -1.5, width: `calc((100% - 26px) * ${progression})`, background: ttlColors.red, borderRadius: 3, transition: "width 0.08s linear" }} />
        {Array.from({ length: total }, (_, i) => {
          const rouge = !!atteintes[i] || !!faites[i];
          return (
            <div
              key={i}
              className="font-body"
              style={{
                width: 26, height: 26, borderRadius: "50%", position: "relative", zIndex: 1,
                background: rouge ? ttlColors.red : ttlColors.card,
                border: `2px solid ${rouge ? ttlColors.red : ttlColors.cardBorder}`,
                color: rouge ? "#fff" : ttlColors.muted,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, transition: "background 0.25s, border-color 0.25s",
              }}
            >
              {faites[i] ? "✓" : i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TtlModuleVideos({ videos, resteQuestionnaire = false, etapeFinale }: Props) {
  const router = useRouter();
  const [watchedIds, setWatchedIds] = useState(new Set(videos.filter((v) => v.watched).map((v) => v.id)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  // La ligne rouge avance avec le défilement : elle suit un repère placé au milieu de l'écran.
  const etapesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [progression, setProgression] = useState(0);
  const [atteintes, setAtteintes] = useState<boolean[]>([]);

  useEffect(() => {
    function maj() {
      const tops = etapesRef.current.map((e) => (e ? e.getBoundingClientRect().top : Infinity));
      if (tops.length < 2) return;
      const repere = window.innerHeight * 0.55;
      let k = -1;
      tops.forEach((t, i) => { if (t <= repere) k = i; });
      let p = 0;
      if (k >= tops.length - 1) p = 1;
      else if (k >= 0) p = (k + Math.max(0, Math.min(1, (repere - tops[k]) / (tops[k + 1] - tops[k])))) / (tops.length - 1);
      setProgression(p);
      setAtteintes(tops.map((t) => t <= repere));
    }
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    window.addEventListener("resize", maj);
    return () => {
      window.removeEventListener("scroll", maj);
      window.removeEventListener("resize", maj);
    };
  }, [videos.length, !!etapeFinale]);

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
        <div style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 14 }}>
          <p className="font-body" style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: ttlColors.redBright }}>
            VIDÉO {i + 1}{watched ? " · VUE" : ""}
          </p>
          <p className="font-body" style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, color: ttlColors.offWhite, lineHeight: 1.3 }}>
            {v.titre}
          </p>
          <button
            onClick={() => setOpenId(v.id)}
            aria-label={`Regarder : ${v.titre}`}
            style={{ display: "block", width: "100%", padding: 0, border: 0, cursor: "pointer", borderRadius: 12, overflow: "hidden", background: "none" }}
          >
            <Couverture video={{ ...v, watched }} />
          </button>
        </div>
      ),
    };
  });
  if (etapeFinale) etapes.push({ cle: "finale", faite: etapeFinale.faite, contenu: etapeFinale.contenu });

  return (
    <>
      {etapes.length > 1 && (
        <Suivi total={etapes.length} progression={progression} atteintes={atteintes} faites={etapes.map((e) => e.faite)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
        {etapes.map((e, i) => (
          <div key={e.cle} ref={(el) => { etapesRef.current[i] = el; }}>
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
