"use client";

import { useState } from "react";
import { ttsColors } from "@/lib/tts-theme";
import { TTS_RECETTE_CATEGORIE_LABELS } from "@/lib/tts";
import type { TtsProgramme, TtsProgrammeVideo, TtsRecette, TtsCapsule, TtsRecetteCategorie, TtsSeanceProgress } from "@/lib/tts";
import { TtsFilterChip, TtsRowCard, TtsNewBadge } from "@/components/TtsUI";
import TtsVideoModal from "@/components/TtsVideoModal";
import TtsCelebration from "@/components/TtsCelebration";

type Tab = "seances" | "recettes" | "capsules";

interface Props {
  initialTab: Tab;
  current: TtsProgramme | null;
  previous: TtsProgramme[];
  future: TtsProgramme[];
  recettes: TtsRecette[];
  capsules: TtsCapsule[];
  seancesProgress: TtsSeanceProgress[];
  initialSemaine: number;
}

const CATEGORIE_ORDER: TtsRecetteCategorie[] = ["petit_dej", "dejeuner", "diner", "collation"];
const SEMAINES = [1, 2, 3, 4];

function progressKey(videoId: string, semaine: number) {
  return `${videoId}:${semaine}`;
}

export default function TtsBibliotheque({ initialTab, current, previous, future, recettes, capsules, seancesProgress, initialSemaine }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [semaine, setSemaine] = useState(initialSemaine);
  const [validated, setValidated] = useState(() => new Set(seancesProgress.map((p) => progressKey(p.video_id, p.semaine))));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openSeanceVideo, setOpenSeanceVideo] = useState<TtsProgrammeVideo | null>(null);
  const [openRecette, setOpenRecette] = useState<TtsRecette | null>(null);
  const [openCapsule, setOpenCapsule] = useState<TtsCapsule | null>(null);
  const [categorieFilter, setCategorieFilter] = useState<TtsRecetteCategorie | "toutes">("toutes");

  const filteredRecettes = categorieFilter === "toutes" ? recettes : recettes.filter((r) => r.categorie === categorieFilter);

  async function handleValidate(videoId: string) {
    const key = progressKey(videoId, semaine);
    setPendingKey(key);
    try {
      const res = await fetch("/api/tts/seances/validate", {
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
      const res = await fetch("/api/tts/seances/validate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, semaine }),
      });
      if (res.ok) setValidated((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        <TtsFilterChip active={tab === "seances"} onClick={() => setTab("seances")}>Séances</TtsFilterChip>
        <TtsFilterChip active={tab === "recettes"} onClick={() => setTab("recettes")}>Recettes</TtsFilterChip>
        <TtsFilterChip active={tab === "capsules"} onClick={() => setTab("capsules")}>Capsules</TtsFilterChip>
      </div>

      {tab === "seances" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {SEMAINES.map((s) => (
              <TtsFilterChip key={s} active={semaine === s} onClick={() => setSemaine(s)}>Semaine {s}</TtsFilterChip>
            ))}
          </div>

          {current ? (
            <>
              <p className="font-body" style={{ color: ttsColors.redBright, fontSize: 11, fontWeight: 700, letterSpacing: "1px", margin: "0 0 10px" }}>
                MOIS {current.numero_mois} · EN COURS · {(current.titre || "Programme").toUpperCase()}
              </p>
              {current.videos.map((v) => {
                const key = progressKey(v.id, semaine);
                return (
                  <TtsSeanceCard
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
                <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>Vidéos à venir.</p>
              )}
            </>
          ) : (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>Aucun programme disponible pour l&apos;instant.</p>
          )}

          {previous.length > 0 && (
            <>
              <p className="font-body" style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", margin: "22px 0 10px" }}>MOIS PRÉCÉDENTS</p>
              {previous.map((p) => {
                const isOpen = openMonth === p.id;
                return (
                  <div key={p.id} style={{ background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
                    <button
                      onClick={() => setOpenMonth(isOpen ? null : p.id)}
                      className="font-body"
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "13px", fontWeight: 600 }}
                    >
                      Mois {p.numero_mois}{p.titre ? ` · ${p.titre}` : ""}
                      <span style={{ color: ttsColors.muted, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 12px 12px" }}>
                        {p.videos.map((v) => (
                          <TtsVideoCard key={v.id} video={v} onClick={() => setOpenSeanceVideo(v)} />
                        ))}
                        {p.videos.length === 0 && <p className="font-body" style={{ color: ttsColors.muted, fontSize: 12 }}>Aucune vidéo.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {future.length > 0 && (
            <>
              <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", margin: "22px 0 10px" }}>À VENIR</p>
              {future.map((p) => (
                <TtsRowCard
                  key={p.id}
                  thumbEmoji="🔒"
                  thumbVariant="module"
                  title={`Mois ${p.numero_mois}${p.titre ? ` · ${p.titre}` : ""}`}
                  subtitle="Se débloque avec ton avancement"
                  locked
                />
              ))}
            </>
          )}
        </div>
      )}

      {tab === "recettes" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
            <TtsFilterChip active={categorieFilter === "toutes"} onClick={() => setCategorieFilter("toutes")}>Toutes</TtsFilterChip>
            {CATEGORIE_ORDER.map((c) => (
              <TtsFilterChip key={c} active={categorieFilter === c} onClick={() => setCategorieFilter(c)}>{TTS_RECETTE_CATEGORIE_LABELS[c]}</TtsFilterChip>
            ))}
          </div>
          {filteredRecettes.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenRecette(r)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, cursor: "pointer" }}
            >
              <div style={{
                height: 110, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                background: r.photo_url ? undefined : "linear-gradient(135deg,#3a3a1f,#1f1f12)",
                backgroundImage: r.photo_url ? `url(${r.photo_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
              }}>
                {!r.photo_url && "🥗"}
                {r.duree_minutes && (
                  <span className="font-body" style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 10 }}>
                    {r.duree_minutes} min
                  </span>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                {r.categorie && (
                  <p className="font-body" style={{ color: ttsColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
                    {TTS_RECETTE_CATEGORIE_LABELS[r.categorie]}
                  </p>
                )}
                <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "4px 0 0" }}>{r.titre}</p>
              </div>
            </button>
          ))}
          {filteredRecettes.length === 0 && (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>Aucune recette dans cette catégorie.</p>
          )}
        </div>
      )}

      {tab === "capsules" && (
        <div>
          {capsules.map((c, i) => (
            <TtsRowCard
              key={c.id}
              thumbEmoji="💡"
              thumbVariant="module"
              title={c.titre}
              subtitle={`Capsule${c.duree_minutes ? ` · ${c.duree_minutes} min` : ""}`}
              onClick={() => setOpenCapsule(c)}
              badge={i === 0 ? <TtsNewBadge /> : undefined}
            />
          ))}
          {capsules.length === 0 && (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>Aucune capsule pour l&apos;instant.</p>
          )}
        </div>
      )}

      {openSeanceVideo && (
        <TtsVideoModal
          titre={openSeanceVideo.titre}
          lien_youtube={openSeanceVideo.lien_youtube}
          description={openSeanceVideo.description}
          materiel={openSeanceVideo.materiel}
          onClose={() => setOpenSeanceVideo(null)}
        />
      )}

      {openCapsule && (
        <TtsVideoModal
          titre={openCapsule.titre}
          lien_youtube={openCapsule.lien_youtube}
          description={openCapsule.description}
          onClose={() => setOpenCapsule(null)}
        />
      )}

      {openRecette && (
        <div
          onClick={() => setOpenRecette(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
          >
            {openRecette.photo_url && (
              <div style={{ width: "100%", height: 180, backgroundImage: `url(${openRecette.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div>
                  {openRecette.categorie && (
                    <p className="font-body" style={{ color: ttsColors.redBright, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>
                      {TTS_RECETTE_CATEGORIE_LABELS[openRecette.categorie]}{openRecette.duree_minutes ? ` · ${openRecette.duree_minutes} min` : ""}
                    </p>
                  )}
                  <p className="font-body" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>{openRecette.titre}</p>
                </div>
                <button onClick={() => setOpenRecette(null)} style={{ background: "none", border: "none", color: ttsColors.muted, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>

              {openRecette.macros && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {Object.entries(openRecette.macros).map(([key, value]) => (
                    <span key={key} className="font-body" style={{ fontSize: "0.7rem", color: "#F5F5F0", backgroundColor: ttsColors.bg, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 20, padding: "4px 10px" }}>
                      {value}{key === "calories" ? " kcal" : key === "proteines" ? " g prot." : key === "glucides" ? " g gluc." : key === "lipides" ? " g lip." : ` ${key}`}
                    </span>
                  ))}
                </div>
              )}

              {openRecette.ingredients && (
                <>
                  <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttsColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>INGRÉDIENTS</p>
                  <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 14px" }}>
                    {openRecette.ingredients}
                  </p>
                </>
              )}

              {openRecette.texte && (
                <>
                  <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: ttsColors.redBright, letterSpacing: "0.06em", margin: "0 0 6px" }}>PRÉPARATION</p>
                  <p className="font-body" style={{ fontSize: "0.82rem", color: "rgba(245,245,240,0.8)", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                    {openRecette.texte}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {celebration && (
        <TtsCelebration message={celebration} emoji="🔥" onDone={() => setCelebration(null)} />
      )}
    </div>
  );
}

function TtsVideoCard({ video, onClick }: { video: TtsProgrammeVideo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: 0, background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, cursor: "pointer" }}
    >
      <div style={{
        height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        background: video.cover_url ? undefined : "linear-gradient(135deg,#B22222,#3a0a0a)",
        backgroundImage: video.cover_url ? `url(${video.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.92)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ttsColors.red }}>
          ▶
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{video.titre}</p>
        <p className="font-body" style={{ color: ttsColors.muted, fontSize: 12, margin: 0 }}>
          {video.materiel.length ? video.materiel.join(", ") : "Aucun matériel"}
        </p>
      </div>
    </button>
  );
}

interface TtsSeanceCardProps {
  video: TtsProgrammeVideo;
  isValidated: boolean;
  isPending: boolean;
  onOpen: () => void;
  onValidate: () => void;
  onRestart: () => void;
}

function TtsSeanceCard({ video, isValidated, isPending, onOpen, onValidate, onRestart }: TtsSeanceCardProps) {
  return (
    <div
      style={{
        background: ttsColors.card,
        border: `2px solid ${isValidated ? ttsColors.green : ttsColors.cardBorder}`,
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
          <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.92)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ttsColors.red }}>
            ▶
          </div>
        </div>
        <div style={{ padding: "12px 14px 8px" }}>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{video.titre}</p>
          <p className="font-body" style={{ color: ttsColors.muted, fontSize: 12, margin: 0 }}>
            {video.materiel.length ? video.materiel.join(", ") : "Aucun matériel"}
          </p>
        </div>
      </button>

      <div style={{ padding: "0 14px 14px" }}>
        {isValidated ? (
          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="font-body"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "rgba(74,222,128,0.12)", border: `1px solid ${ttsColors.green}`, borderRadius: 12, color: ttsColors.green, fontSize: 13, fontWeight: 700 }}
            >
              ✓ Séance validée
            </div>
            <button
              onClick={onRestart}
              disabled={isPending}
              className="font-body"
              style={{ padding: "10px 14px", background: "none", border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 12, color: ttsColors.muted, fontSize: 13, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
            >
              {isPending ? "..." : "Redémarrer"}
            </button>
          </div>
        ) : (
          <button
            onClick={onValidate}
            disabled={isPending}
            className="font-body"
            style={{ width: "100%", padding: "12px 0", background: isPending ? ttsColors.cardBorder : ttsColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer" }}
          >
            {isPending ? "..." : "✓ Valider la séance"}
          </button>
        )}
      </div>
    </div>
  );
}
