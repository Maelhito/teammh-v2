"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ttlColors } from "@/lib/ttl-theme";
import type { TtlProgramme, TtlProgrammeVideo, TtlSeanceProgress } from "@/lib/ttl";
import { TtlFilterChip } from "@/components/TtlUI";
import TtlVideoModal from "@/components/TtlVideoModal";
import TtlCelebration from "@/components/TtlCelebration";

interface Props {
  current: TtlProgramme | null;
  /** Tous les programmes sortis, dans l'ordre de sortie. */
  programmes: TtlProgramme[];
  /** Validations de la période en cours seulement. */
  seancesProgress: TtlSeanceProgress[];
  initialSemaine: number;
  isPreview: boolean;
}

const SEMAINES = [1, 2, 3, 4];

function progressKey(videoId: string, semaine: number) {
  return `${videoId}:${semaine}`;
}

export default function TtlSport({ current, programmes, seancesProgress, initialSemaine, isPreview }: Props) {
  const router = useRouter();
  const [semaine, setSemaine] = useState(initialSemaine);
  const [validated, setValidated] = useState(() => new Set(seancesProgress.map((p) => progressKey(p.video_id, p.semaine))));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [openProgramme, setOpenProgramme] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [openSeanceVideo, setOpenSeanceVideo] = useState<TtlProgrammeVideo | null>(null);

  async function handleValidate(videoId: string) {
    const key = progressKey(videoId, semaine);
    setPendingKey(key);
    try {
      const res = await fetch("/api/ttl/seances/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, semaine }),
      });
      if (res.ok) {
        setValidated((prev) => new Set(prev).add(key));
        setCelebration("Séance validée !");
      }
    } finally {
      setPendingKey(null);
    }
  }

  async function handleRestart(videoId: string) {
    const key = progressKey(videoId, semaine);
    setPendingKey(key);
    try {
      const res = await fetch("/api/ttl/seances/validate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, semaine }),
      });
      if (res.ok) setValidated((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleChoose(programmeId: string) {
    setChoosingId(programmeId);
    try {
      const res = await fetch("/api/ttl/programme/choisir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId }),
      });
      if (res.ok) {
        setOpenProgramme(null);
        setCelebration("Programme choisi !");
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      }
    } finally {
      setChoosingId(null);
    }
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      {current?.cover_url && (
        <div
          style={{
            position: "relative", width: "100%", height: 156, borderRadius: 18, overflow: "hidden", marginBottom: 16,
            backgroundImage: `url(${current.cover_url})`, backgroundSize: "cover", backgroundPosition: "center",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.8) 100%)" }} />
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
            <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", margin: "0 0 4px" }}>
              EN COURS
            </p>
            <p className="font-body" style={{ color: "#fff", fontSize: 19, fontWeight: 700, margin: 0, lineHeight: 1.2, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
              {current.titre || "Programme"}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {SEMAINES.map((s) => (
          <TtlFilterChip key={s} active={semaine === s} onClick={() => setSemaine(s)}>Semaine {s}</TtlFilterChip>
        ))}
      </div>

      {current ? (
        <>
          {!current.cover_url && (
            <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 11, fontWeight: 700, letterSpacing: "1px", margin: "0 0 10px" }}>
              EN COURS · {(current.titre || "Programme").toUpperCase()}
            </p>
          )}
          {current.videos.map((v) => {
            const key = progressKey(v.id, semaine);
            return (
              <TtlSeanceCard
                key={v.id}
                video={v}
                isValidated={validated.has(key)}
                isPending={pendingKey === key}
                onOpen={() => setOpenSeanceVideo(v)}
                onValidate={() => handleValidate(v.id)}
                onRestart={() => handleRestart(v.id)}
              />
            );
          })}
          {current.videos.length === 0 && (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Vidéos à venir.</p>
          )}
        </>
      ) : (
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>Aucun programme disponible pour l&apos;instant.</p>
      )}

      {programmes.length > 0 && (
        <>
          <p className="font-body" style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", margin: "28px 0 4px" }}>CHOISIR SON PROGRAMME</p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: "0 0 12px" }}>
            Envie de refaire un programme ? Choisis-le pour tes 4 semaines en cours.
          </p>
          {programmes.map((p) => {
            const isOpen = openProgramme === p.id;
            const isCurrent = current?.id === p.id;
            return (
              <div key={p.id} style={{ background: ttlColors.card, border: `1px solid ${isCurrent ? ttlColors.red : ttlColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
                <button
                  onClick={() => setOpenProgramme(isOpen ? null : p.id)}
                  className="font-body"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 10, background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 600, textAlign: "left" }}
                >
                  <span
                    style={{
                      width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                      background: p.cover_url ? `center / cover no-repeat url(${p.cover_url})` : "linear-gradient(135deg,#B22222,#3a0a0a)",
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {p.titre || "Programme"}
                    <span style={{ display: "block", color: isCurrent ? ttlColors.redBright : ttlColors.muted, fontSize: 12, fontWeight: isCurrent ? 700 : 400, marginTop: 2 }}>
                      {isCurrent ? "En cours" : `${p.videos.length} séance${p.videos.length > 1 ? "s" : ""}`}
                    </span>
                  </span>
                  <span style={{ color: ttlColors.muted, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {p.videos.map((v) => (
                      <TtlVideoCard key={v.id} video={v} onClick={() => setOpenSeanceVideo(v)} />
                    ))}
                    {p.videos.length === 0 && <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12 }}>Aucune vidéo.</p>}
                    {!isCurrent && (
                      <button
                        onClick={() => handleChoose(p.id)}
                        disabled={isPreview || choosingId !== null}
                        className="font-body"
                        style={{ width: "100%", padding: "12px 0", background: isPreview || choosingId ? ttlColors.cardBorder : ttlColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: isPreview || choosingId ? "not-allowed" : "pointer" }}
                      >
                        {choosingId === p.id ? "..." : "Choisir ce programme pour ce mois-ci"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {openSeanceVideo && (
        <TtlVideoModal
          titre={openSeanceVideo.titre}
          lien_youtube={openSeanceVideo.lien_youtube}
          description={openSeanceVideo.description}
          materiel={openSeanceVideo.materiel}
          autoplay
          onClose={() => setOpenSeanceVideo(null)}
        />
      )}

      {celebration && (
        <TtlCelebration message={celebration} emoji="🔥" onDone={() => setCelebration(null)} />
      )}
    </div>
  );
}

function TtlVideoCard({ video, onClick }: { video: TtlProgrammeVideo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, cursor: "pointer" }}
    >
      <div style={{
        height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        background: video.cover_url ? undefined : "linear-gradient(135deg,#B22222,#3a0a0a)",
        backgroundImage: video.cover_url ? `url(${video.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.92)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ttlColors.red }}>
          ▶
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{video.titre}</p>
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0 }}>
          {video.materiel.length ? video.materiel.join(", ") : "Aucun matériel"}
        </p>
      </div>
    </button>
  );
}

interface TtlSeanceCardProps {
  video: TtlProgrammeVideo;
  isValidated: boolean;
  isPending: boolean;
  onOpen: () => void;
  onValidate: () => void;
  onRestart: () => void;
}

function TtlSeanceCard({ video, isValidated, isPending, onOpen, onValidate, onRestart }: TtlSeanceCardProps) {
  return (
    <div
      style={{
        background: ttlColors.card,
        border: `2px solid ${isValidated ? ttlColors.green : ttlColors.cardBorder}`,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <button
        onClick={onOpen}
        style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{
          height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          background: video.cover_url ? undefined : "linear-gradient(135deg,#B22222,#3a0a0a)",
          backgroundImage: video.cover_url ? `url(${video.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
        }}>
          <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.92)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ttlColors.red }}>
            ▶
          </div>
        </div>
        <div style={{ padding: "12px 14px 8px" }}>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{video.titre}</p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, margin: 0 }}>
            {video.materiel.length ? video.materiel.join(", ") : "Aucun matériel"}
          </p>
        </div>
      </button>

      <div style={{ padding: "0 14px 14px" }}>
        {isValidated ? (
          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="font-body"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "rgba(74,222,128,0.12)", border: `1px solid ${ttlColors.green}`, borderRadius: 12, color: ttlColors.green, fontSize: 13, fontWeight: 700 }}
            >
              ✓ Séance validée
            </div>
            <button
              onClick={onRestart}
              disabled={isPending}
              className="font-body"
              style={{ padding: "10px 14px", background: "none", border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 12, color: ttlColors.muted, fontSize: 13, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
            >
              {isPending ? "..." : "Redémarrer"}
            </button>
          </div>
        ) : (
          <button
            onClick={onValidate}
            disabled={isPending}
            className="font-body"
            style={{ width: "100%", padding: "12px 0", background: isPending ? ttlColors.cardBorder : ttlColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer" }}
          >
            {isPending ? "..." : "✓ Valider la séance"}
          </button>
        )}
      </div>
    </div>
  );
}
