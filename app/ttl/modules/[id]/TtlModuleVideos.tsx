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
        <span className="font-body" style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.7)", color: ttlColors.green, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 20 }}>
          ✓ Vue
        </span>
      )}
    </div>
  );
}

/** Pastille numérotée du chemin : rouge une fois atteinte en défilant, ✓ une fois faite. */
function Pastille({ numero, atteinte, faite }: { numero: number; atteinte: boolean; faite: boolean }) {
  return (
    <div
      style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0, position: "relative", zIndex: 1,
        background: faite ? ttlColors.green : atteinte ? ttlColors.red : ttlColors.card,
        border: `2px solid ${faite ? ttlColors.green : atteinte ? ttlColors.redBright : ttlColors.cardBorder}`,
        color: atteinte || faite ? "#fff" : ttlColors.muted,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, transition: "background 0.25s, border-color 0.25s",
      }}
      className="font-body"
    >
      {faite ? "✓" : numero}
    </div>
  );
}

export default function TtlModuleVideos({ videos, resteQuestionnaire = false, etapeFinale }: Props) {
  const router = useRouter();
  const [watchedIds, setWatchedIds] = useState(new Set(videos.filter((v) => v.watched).map((v) => v.id)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  // La ligne rouge descend avec le défilement : elle s'arrête au niveau du milieu de l'écran.
  const cheminRef = useRef<HTMLDivElement>(null);
  const pastillesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [remplissage, setRemplissage] = useState(0);
  const [atteintes, setAtteintes] = useState<boolean[]>([]);

  useEffect(() => {
    function maj() {
      const chemin = cheminRef.current;
      if (!chemin) return;
      const repere = window.innerHeight * 0.55;
      const haut = chemin.getBoundingClientRect().top;
      setRemplissage(Math.max(0, Math.min(chemin.offsetHeight, repere - haut)));
      setAtteintes(pastillesRef.current.map((p) => !!p && p.getBoundingClientRect().top <= repere));
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

  const etapes: { cle: string; faite: boolean; contenu: React.ReactNode }[] = videos.map((v) => {
    const watched = watchedIds.has(v.id);
    return {
      cle: v.id,
      faite: watched,
      contenu: (
        <button
          onClick={() => setOpenId(v.id)}
          style={{
            display: "block", width: "100%", padding: 0, textAlign: "left", cursor: "pointer",
            background: ttlColors.card, border: `1px solid ${watched ? "rgba(74,222,128,0.35)" : "rgba(230,57,70,0.35)"}`,
            borderRadius: 18, overflow: "hidden",
          }}
        >
          <Couverture video={{ ...v, watched }} />
          <div style={{ padding: "14px 16px 16px" }}>
            <p className="font-body" style={{ margin: 0, fontWeight: 800, fontSize: 18, lineHeight: 1.25, color: ttlColors.redBright }}>
              {v.titre}
            </p>
            {v.description && (
              <p className="font-body" style={{ margin: "6px 0 0", fontSize: 13, color: "#cfc8c0", lineHeight: 1.45 }}>{v.description}</p>
            )}
            <p className="font-body" style={{ margin: "10px 0 0", fontSize: 12.5, fontWeight: 700, color: watched ? ttlColors.green : "#fff" }}>
              {watched ? "✓ Vidéo vue · la revoir" : "▶ Regarder la vidéo"}
            </p>
          </div>
        </button>
      ),
    };
  });
  if (etapeFinale) etapes.push({ cle: "finale", faite: etapeFinale.faite, contenu: etapeFinale.contenu });

  return (
    <>
      <div ref={cheminRef} style={{ position: "relative", paddingBottom: 8 }}>
        {/* Rail gris, et la ligne rouge qui le remplit en défilant */}
        <div style={{ position: "absolute", left: 16, top: 17, bottom: 24, width: 3, background: ttlColors.cardBorder, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: 16, top: 17, width: 3, height: Math.max(0, remplissage - 17), maxHeight: "calc(100% - 41px)", background: `linear-gradient(180deg, ${ttlColors.red}, ${ttlColors.redBright})`, borderRadius: 3, transition: "height 0.08s linear" }} />

        {etapes.map((e, i) => (
          <div key={e.cle} style={{ display: "flex", gap: 12, marginBottom: 22 }}>
            <div ref={(el) => { pastillesRef.current[i] = el; }} style={{ width: 35, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <Pastille numero={i + 1} atteinte={!!atteintes[i]} faite={e.faite} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {e.contenu}
            </div>
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
