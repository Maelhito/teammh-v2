"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface RichExercise {
  _key: string;
  exercise: { id: string; nom: string; groupe_musculaire: string; materiel: string; video_url: string | null; miniature_url: string | null } | null;
  series?: string | null;
  repetitions?: string | null;
  duree_secondes?: number | null;
  temps_repos?: number | null;
  notes?: string | null;
}
interface TabataItem {
  _key: string; exercise_id: string;
  exercise: { nom: string; video_url: string | null; miniature_url?: string | null } | null;
  series: string; tabata_work: string; tabata_rest: string;
}
interface Bloc {
  _key: string; type: string; nom: string; format: string;
  instructions: string; type_score: string; note_bloc: string;
  tabata_work: string; tabata_rest: string; tabata_tours: string;
  tabata_exercices: TabataItem[];
  emom_rounds: string; emom_interval_min: string; emom_interval_sec: string;
  amrap_duree: string; for_time_limit: string;
  rich_exercices: RichExercise[];
}
interface SeanceData {
  nom: string; categorie: string; niveau: string; duree_estimee: string; note: string;
  blocs: Bloc[];
}

/* Retourne les exercices d'un bloc quel que soit son format */
function getBlocExs(bloc: Bloc): RichExercise[] {
  if (bloc.format === "tabata") {
    return bloc.tabata_exercices.map(ti => ({
      _key: ti._key,
      exercise: ti.exercise
        ? { id: "", nom: ti.exercise.nom, groupe_musculaire: "", materiel: "", video_url: ti.exercise.video_url, miniature_url: ti.exercise.miniature_url ?? null }
        : null,
      series: ti.series || null,
    }));
  }
  return bloc.rich_exercices;
}

const BLOC_COLORS: Record<string, string> = {
  echauffement: "#F97316", corps: "#B22222", finisher: "#8B5CF6",
};
const BLOC_LABELS: Record<string, string> = {
  echauffement: "ÉCHAUFFEMENT", corps: "CORPS DE SÉANCE", finisher: "FINISHER",
};
const BLOC_EMOJIS: Record<string, string> = {
  echauffement: "🔥", corps: "💪", finisher: "⚡",
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---- Web Audio — iOS/Android compatible ---- */
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      audioCtx = new AC();
    }
    return audioCtx;
  } catch { return null; }
}

function _playOneBip(ctx: AudioContext, freq: number, duration: number, volume: number, startAt: number) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "square"; // plus percutant que "sine"
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration);
  } catch {}
}

// Bip simple (compte à rebours 3/2/1)
function playBeep(freq = 880, duration = 0.18, volume = 2.0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const doPlay = () => _playOneBip(ctx, freq, duration, volume, ctx.currentTime);
  if (ctx.state === "suspended") { ctx.resume().then(doPlay).catch(() => {}); }
  else { doPlay(); }
}

// Triple bip fort pour transition de bloc / passage de minute
function playTransitionBeep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const doPlay = () => {
    const now = ctx.currentTime;
    _playOneBip(ctx, 1047, 0.15, 2.5, now);          // do
    _playOneBip(ctx, 1175, 0.15, 2.5, now + 0.20);   // ré
    _playOneBip(ctx, 1319, 0.30, 2.5, now + 0.40);   // mi long
  };
  if (ctx.state === "suspended") { ctx.resume().then(doPlay).catch(() => {}); }
  else { doPlay(); }
}

function initAudio() {
  const ctx = getAudioCtx();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
}

/* ---- Wake Lock — empêche l'écran de s'éteindre ---- */
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      // iOS/Android re-release le lock quand l'app passe en arrière-plan — on le re-demande
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && !wakeLock) {
          try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
        }
      }, { once: false });
    }
  } catch {}
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m ? m[1] : null;
}

/* ---- Popup vidéo ---- */
function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const ytId = getYoutubeId(url);
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 480, backgroundColor: "#111", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
          <p className="font-body" style={{ fontSize: "0.8rem", color: "#888", margin: 0 }}>Vidéo exercice</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {ytId ? (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; fullscreen"
            />
          </div>
        ) : (
          <video src={url} controls autoPlay style={{ width: "100%", display: "block", maxHeight: "60vh" }} />
        )}
      </div>
    </div>
  );
}

/* ---- Carte exercice ---- */
function ExerciceCard({ ex, done, onToggle, onVideoClick }: {
  ex: RichExercise; done: boolean; onToggle?: () => void; onVideoClick?: () => void;
}) {
  const nom = ex.exercise?.nom ?? "Exercice";
  const details: string[] = [];
  if (ex.series) details.push(`${ex.series} séries`);
  if (ex.repetitions) details.push(`${ex.repetitions} reps`);
  if (ex.duree_secondes) details.push(`${ex.duree_secondes}s`);
  if (ex.temps_repos) details.push(`Repos: ${ex.temps_repos}s`);
  const hasVideo = !!ex.exercise?.video_url;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", backgroundColor: done ? "rgba(74,222,128,0.05)" : "#0D0D0D", border: `1px solid ${done ? "rgba(74,222,128,0.2)" : "#1a1a1a"}`, borderRadius: 14 }}>
      {/* Miniature cliquable si vidéo */}
      <button
        onClick={hasVideo ? onVideoClick : undefined}
        style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: hasVideo ? "pointer" : "default", padding: 0, position: "relative" }}
      >
        {ex.exercise?.miniature_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.exercise.miniature_url} alt={nom} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: done ? 0.4 : 1 }} />
        ) : (
          <span style={{ fontSize: "1.4rem", opacity: done ? 0.4 : 1 }}>💪</span>
        )}
        {hasVideo && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1rem" }}>▶</span>
          </div>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-body" style={{ fontWeight: 700, fontSize: "0.9rem", color: done ? "#555" : "#F5F5F0", margin: 0, textDecoration: done ? "line-through" : "none" }}>{nom}</p>
        {details.length > 0 && (
          <p className="font-body" style={{ fontSize: "0.72rem", color: "#666", margin: "3px 0 0" }}>{details.join(" · ")}</p>
        )}
        {ex.notes && <p className="font-body" style={{ fontSize: "0.7rem", color: "#444", margin: "2px 0 0", fontStyle: "italic" }}>{ex.notes}</p>}
      </div>

      {/* Bouton vidéo si pas de miniature */}
      {hasVideo && !ex.exercise?.miniature_url && (
        <button
          onClick={onVideoClick}
          style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#F5F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: "0.85rem" }}
        >
          ▶
        </button>
      )}

      {/* Checkbox si onToggle fourni */}
      {onToggle && (
        <button
          onClick={onToggle}
          style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${done ? "#4ADE80" : "#2a2a2a"}`, backgroundColor: done ? "rgba(74,222,128,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>}
        </button>
      )}
    </div>
  );
}

/* ---- Stopwatch header (compte en montant, tourne en continu) ---- */
function StopwatchHeader({ style }: { style?: React.CSSProperties }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  return <span style={style}>{formatTime(elapsed)}</span>;
}

/* ---- Stopwatch bloc (démarrage manuel) ---- */
function StopwatchBloc({ color }: { color: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) { ref.current = setInterval(() => setElapsed((e) => e + 1), 1000); }
    else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 8px" }}>DURÉE DU BLOC</p>
      <p style={{ fontFamily: "monospace", fontSize: "3.2rem", fontWeight: 700, color: "#F5F5F0", lineHeight: 1, margin: "0 0 16px" }}>
        {formatTime(elapsed)}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          onClick={() => { initAudio(); setRunning((r) => !r); }}
          style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: running ? "#333" : color, color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}
        >
          {running ? "⏸ Pause" : elapsed === 0 ? "▶ Démarrer" : "▶ Reprendre"}
        </button>
        <button onClick={() => { setElapsed(0); setRunning(false); }} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: "0.9rem", cursor: "pointer" }}>↺</button>
      </div>
    </div>
  );
}

/* ---- Compte à rebours avec auto-start + bips ---- */
function Countdown({ totalSeconds, label }: { totalSeconds: number; label: string }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false); // démarrage manuel
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRemaining = useRef(totalSeconds);

  useEffect(() => {
    if (running && remaining > 0) {
      ref.current = setInterval(() => {
        setRemaining((r) => {
          const next = Math.max(0, r - 1);
          if (next <= 3 && next > 0) playBeep(next === 1 ? 1200 : 880, 0.18, 2.0);
          if (next === 0) playTransitionBeep();
          prevRemaining.current = next;
          return next;
        });
      }, 1000);
    } else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, remaining]);

  const finished = remaining === 0;
  const isAlert = remaining <= 3 && remaining > 0;

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontFamily: "monospace", fontSize: "3.2rem", fontWeight: 700, color: finished ? "#4ADE80" : isAlert ? "#EF4444" : "#F5F5F0", lineHeight: 1, margin: "0 0 16px", transition: "color 0.2s" }}>
        {formatTime(remaining)}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRunning((r) => !r)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: running ? "#333" : "#B22222", color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>
          {finished ? "✓ Terminé" : running ? "⏸ Pause" : remaining === totalSeconds ? "▶ Démarrer" : "▶ Reprendre"}
        </button>
        <button onClick={() => { setRemaining(totalSeconds); setRunning(false); }} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: "0.9rem", cursor: "pointer" }}>↺</button>
      </div>
    </div>
  );
}

/* ---- Timer EMOM avec auto-start + bips ---- */
function EmomTimer({ intervalSec, rounds }: { intervalSec: number; rounds: number }) {
  const [currentRound, setCurrentRound] = useState(1);
  const [remaining, setRemaining] = useState(intervalSec);
  const [running, setRunning] = useState(false); // démarrage manuel
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1;
          if (next <= 3 && next > 0) playBeep(next === 1 ? 1200 : 880, 0.18, 2.0);
          if (next <= 0) {
            playTransitionBeep();
            setCurrentRound((cr) => {
              if (cr >= rounds) { setRunning(false); return cr; }
              return cr + 1;
            });
            return intervalSec;
          }
          return next;
        });
      }, 1000);
    } else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, intervalSec, rounds]);

  const finished = currentRound >= rounds && remaining <= 1;
  const isAlert = remaining <= 3 && remaining > 0;

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 4px" }}>EMOM — ROUND {currentRound}/{rounds}</p>
      <p style={{ fontFamily: "monospace", fontSize: "3.2rem", fontWeight: 700, color: finished ? "#4ADE80" : isAlert ? "#EF4444" : "#F5F5F0", lineHeight: 1, margin: "0 0 16px", transition: "color 0.2s" }}>
        {formatTime(remaining)}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRunning((r) => !r)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: running ? "#333" : "#B22222", color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>
          {finished ? "✓ Terminé" : running ? "⏸ Pause" : currentRound === 1 && remaining === intervalSec ? "▶ Démarrer" : "▶ Reprendre"}
        </button>
        <button onClick={() => { setCurrentRound(1); setRemaining(intervalSec); setRunning(false); }} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: "0.9rem", cursor: "pointer" }}>↺</button>
      </div>
    </div>
  );
}

/* ---- Timer Tabata avec auto-start + bips ---- */
function TabataTimer({ workSec, restSec, tours }: { workSec: number; restSec: number; tours: number }) {
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [currentTour, setCurrentTour] = useState(1);
  const [remaining, setRemaining] = useState(workSec);
  const [running, setRunning] = useState(false); // démarrage manuel
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1;
          if (next <= 3 && next > 0) playBeep(next === 1 ? 1200 : 880, 0.18, 2.0);
          if (next <= 0) {
            playTransitionBeep();
            if (phase === "work") { setPhase("rest"); return restSec; }
            else {
              setCurrentTour((t) => {
                if (t >= tours) { setRunning(false); return t; }
                return t + 1;
              });
              setPhase("work");
              return workSec;
            }
          }
          return next;
        });
      }, 1000);
    } else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, phase, workSec, restSec, tours]);

  const finished = currentTour >= tours && phase === "rest" && remaining <= 1;
  const phaseColor = phase === "work" ? "#B22222" : "#3B82F6";
  const isAlert = remaining <= 3 && remaining > 0;

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: phaseColor, letterSpacing: "0.1em", margin: "0 0 4px" }}>
        TABATA — {phase === "work" ? "TRAVAIL" : "REPOS"} · TOUR {currentTour}/{tours}
      </p>
      <p style={{ fontFamily: "monospace", fontSize: "3.2rem", fontWeight: 700, color: finished ? "#4ADE80" : isAlert ? "#EF4444" : "#F5F5F0", lineHeight: 1, margin: "0 0 16px", transition: "color 0.2s" }}>
        {formatTime(remaining)}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRunning((r) => !r)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: running ? "#333" : phaseColor, color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>
          {finished ? "✓ Terminé" : running ? "⏸ Pause" : currentTour === 1 && phase === "work" && remaining === workSec ? "▶ Démarrer" : "▶ Reprendre"}
        </button>
        <button onClick={() => { setPhase("work"); setCurrentTour(1); setRemaining(workSec); setRunning(false); }} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: "0.9rem", cursor: "pointer" }}>↺</button>
      </div>
    </div>
  );
}

/* ---- Timer du bloc selon format ---- */
function BlocTimer({ bloc }: { bloc: Bloc }) {
  if (bloc.format === "classique" || !bloc.format) return null;
  if (bloc.format === "amrap") {
    const sec = parseInt(bloc.amrap_duree || "10") * 60;
    return <Countdown totalSeconds={sec} label={`AMRAP · ${bloc.amrap_duree || 10} min`} />;
  }
  if (bloc.format === "for_time") {
    const sec = parseInt(bloc.for_time_limit || "20") * 60;
    return <Countdown totalSeconds={sec} label={`FOR TIME · limite ${bloc.for_time_limit || 20} min`} />;
  }
  if (bloc.format === "emom") {
    const intervalSec = parseInt(bloc.emom_interval_min || "1") * 60 + parseInt(bloc.emom_interval_sec || "0");
    const rounds = parseInt(bloc.emom_rounds || "8");
    return <EmomTimer intervalSec={intervalSec} rounds={rounds} />;
  }
  if (bloc.format === "tabata") {
    const workSec = parseInt(bloc.tabata_work || "20");
    const restSec = parseInt(bloc.tabata_rest || "10");
    const tours = parseInt(bloc.tabata_tours || "8");
    return <TabataTimer workSec={workSec} restSec={restSec} tours={tours} />;
  }
  return null;
}

/* ================== COMPOSANT PRINCIPAL ================== */
export default function SeanceViewer({
  assignmentId, gridKey, seanceData, seanceName, nomProgramme,
}: {
  assignmentId: string; gridKey: string;
  seanceData: SeanceData; seanceName: string; nomProgramme: string;
}) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [currentBlocIndex, setCurrentBlocIndex] = useState(0);
  const [openBlocs, setOpenBlocs] = useState<Set<number>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const [streakResult, setStreakResult] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedMin, setElapsedMin] = useState(0);
  const [logId, setLogId] = useState<string | null>(null);
  const [noteEtoiles, setNoteEtoiles] = useState(0);
  const [noteTexte, setNoteTexte] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  const allBlocs = seanceData.blocs ?? [];
  const currentBloc = allBlocs[currentBlocIndex];
  const isLastBloc = currentBlocIndex === allBlocs.length - 1;

  const toggleBloc = useCallback((i: number) => {
    setOpenBlocs((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }, []);

  async function finirSeance() {
    setFinishing(true);
    releaseWakeLock();
    playTransitionBeep();
    setElapsedMin(Math.round((Date.now() - startTimeRef.current) / 60000));
    try {
      const res = await fetch("/api/entrainement/terminer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, gridKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.streak === "number") setStreakResult(data.streak);
      if (typeof data.logId === "string") setLogId(data.logId);
    } catch {}
    setDone(true);
    setFinishing(false);
  }

  async function sauvegarderNote() {
    if (!logId) { router.push("/entrainement"); return; }
    setNoteSaving(true);
    try {
      await fetch("/api/entrainement/noter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, note_etoiles: noteEtoiles || null, note_texte: noteTexte, duration_min: elapsedMin || null }),
      });
    } catch {}
    setNoteSaved(true);
    setNoteSaving(false);
    router.push("/entrainement");
  }

  /* ---- Écran terminé ---- */
  if (done) {
    const totalExercices = (seanceData.blocs ?? []).reduce((acc, b) => {
      const exs = getBlocExs(b);
      return acc + exs.filter((e) => e.exercise !== null).length;
    }, 0);
    const messages = [
      "Tu t'es surpassée aujourd'hui. 💪",
      "Chaque séance te rapproche de ton objectif. 🎯",
      "La régularité fait toute la différence. 🔥",
      "Fierté garantie. Tu l'as mérité. ⚡",
      "Corps et mental : tu progresses sur les deux. 🏆",
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const confettiColors = ["#B22222", "#FB923C", "#FBBF24", "#4ADE80", "#3B82F6", "#A78BFA"];
    const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
      color: confettiColors[i % confettiColors.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      size: `${6 + Math.random() * 8}px`,
    }));

    return (
      <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative" }}>
        {/* Confettis CSS */}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-60px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {confettiPieces.map((p, i) => (
          <div key={i} style={{
            position: "fixed", top: 0, left: p.left,
            width: p.size, height: p.size,
            backgroundColor: p.color, borderRadius: "2px",
            animation: `confettiFall 2.5s ${p.delay} ease-in forwards`,
            pointerEvents: "none", zIndex: 0,
          }} />
        ))}

        <div style={{ textAlign: "center", maxWidth: 360, position: "relative", zIndex: 1 }}>
          {/* Trophée */}
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>🏆</div>

          <h1 className="font-title" style={{ fontSize: "2rem", color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 6px" }}>
            SÉANCE TERMINÉE
          </h1>
          <p className="font-body" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 24px" }}>
            {(seanceName || seanceData.nom).toUpperCase()}
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "center" }}>
            {elapsedMin > 0 && (
              <div style={{ flex: 1, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                <p className="font-title" style={{ fontSize: "1.5rem", color: "#F5F5F0", margin: 0, lineHeight: 1 }}>{elapsedMin}</p>
                <p className="font-body" style={{ fontSize: "0.65rem", color: "#555", margin: "4px 0 0", letterSpacing: "0.06em" }}>MIN</p>
              </div>
            )}
            {totalExercices > 0 && (
              <div style={{ flex: 1, backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                <p className="font-title" style={{ fontSize: "1.5rem", color: "#F5F5F0", margin: 0, lineHeight: 1 }}>{totalExercices}</p>
                <p className="font-body" style={{ fontSize: "0.65rem", color: "#555", margin: "4px 0 0", letterSpacing: "0.06em" }}>EXERCICES</p>
              </div>
            )}
            {streakResult !== null && streakResult > 0 && (
              <div style={{ flex: 1, backgroundColor: "#1a0a00", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                <p className="font-title" style={{ fontSize: "1.5rem", color: "#FB923C", margin: 0, lineHeight: 1 }}>🔥{streakResult}</p>
                <p className="font-body" style={{ fontSize: "0.65rem", color: "#FB923C", margin: "4px 0 0", letterSpacing: "0.06em", opacity: 0.7 }}>FLAMME</p>
              </div>
            )}
          </div>

          {/* Message motivant */}
          <p className="font-body" style={{ fontSize: "0.88rem", color: "#777", margin: "0 0 28px", lineHeight: 1.6, fontStyle: "italic" }}>
            {msg}
          </p>

          {/* Note séance */}
          {!noteSaved && (
            <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "20px 16px", marginBottom: 20, textAlign: "left" }}>
              <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 12px", textAlign: "center" }}>
                COMMENT S'EST PASSÉE CETTE SÉANCE ?
              </p>

              {/* Étoiles */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNoteEtoiles(n === noteEtoiles ? 0 : n)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: "1.8rem", lineHeight: 1, filter: n <= noteEtoiles ? "none" : "grayscale(1) opacity(0.25)", transition: "filter 0.15s, transform 0.1s", transform: n <= noteEtoiles ? "scale(1.1)" : "scale(1)" }}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              {/* Zone de texte */}
              <textarea
                value={noteTexte}
                onChange={(e) => setNoteTexte(e.target.value)}
                placeholder="Ajoute une note (points durs, ressenti, charge…)"
                style={{ width: "100%", minHeight: 80, backgroundColor: "#0D0D0D", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", fontSize: "0.85rem", color: "#F5F5F0", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }}
              />

              <button
                onClick={sauvegarderNote}
                disabled={noteSaving}
                style={{ width: "100%", marginTop: 12, padding: "13px", backgroundColor: noteSaving ? "#333" : "#B22222", color: noteSaving ? "#666" : "#fff", border: "none", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, cursor: noteSaving ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
              >
                {noteSaving ? "Enregistrement…" : "SAUVEGARDER & CONTINUER →"}
              </button>

              <button
                onClick={() => router.push("/entrainement")}
                style={{ width: "100%", marginTop: 8, padding: "10px", backgroundColor: "transparent", color: "#444", border: "none", borderRadius: 12, fontSize: "0.8rem", cursor: "pointer" }}
              >
                Passer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---- Mode actif ---- */
  if (started && currentBloc) {
    const color = BLOC_COLORS[currentBloc.type] ?? "#B22222";
    const label = BLOC_LABELS[currentBloc.type] ?? currentBloc.type.toUpperCase();
    const emoji = BLOC_EMOJIS[currentBloc.type] ?? "💪";
    const blocExs = getBlocExs(currentBloc);

    return (
      <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
        {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

        {/* Header + chrono global */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#0D0D0D", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 1px" }}>{nomProgramme.toUpperCase()}</p>
              <p className="font-title" style={{ fontSize: "1.05rem", color: "#F5F5F0", letterSpacing: "0.04em", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {(seanceName || seanceData.nom).toUpperCase()}
              </p>
            </div>
            <StopwatchHeader style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, color: "#F5F5F0", flexShrink: 0, letterSpacing: "0.05em" }} />
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px 0" }}>
          {/* Titre du bloc */}
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <span style={{ fontSize: "2.8rem", display: "block", marginBottom: 8 }}>{emoji}</span>
            <h2 className="font-title" style={{ fontSize: "2rem", color: color, letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</h2>
            {currentBloc.nom && (
              <p className="font-body" style={{ fontSize: "0.88rem", color: "#888", margin: 0 }}>{currentBloc.nom}</p>
            )}
            <p className="font-body" style={{ fontSize: "0.7rem", color: "#444", margin: "6px 0 0", letterSpacing: "0.05em" }}>
              BLOC {currentBlocIndex + 1}/{allBlocs.length}
            </p>
          </div>

          {/* Timer selon format */}
          <div style={{ backgroundColor: "#111111", border: `1px solid ${color}30`, borderRadius: 16, padding: "4px 0 16px", marginBottom: 20 }}>
            {currentBloc.format === "classique" || !currentBloc.format ? (
              <StopwatchBloc color={color} />
            ) : (
              <BlocTimer bloc={currentBloc} />
            )}
          </div>

          {/* Instructions */}
          {currentBloc.instructions && (
            <div className="font-body" style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: 16, padding: "12px 14px", backgroundColor: "#111", borderRadius: 10, border: "1px solid #1a1a1a" }}
              dangerouslySetInnerHTML={{ __html: currentBloc.instructions }} />
          )}

          {/* Exercices */}
          {blocExs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                EXERCICES · {blocExs.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {blocExs.map((ex) => (
                  <ExerciceCard
                    key={ex._key}
                    ex={ex}
                    done={false}
                    onVideoClick={ex.exercise?.video_url ? () => setVideoUrl(ex.exercise!.video_url!) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bouton bas */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0D0D0D", borderTop: "1px solid #1a1a1a", padding: "16px", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 50 }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {isLastBloc ? (
              <button onClick={finirSeance} disabled={finishing} style={{ width: "100%", padding: "16px", backgroundColor: finishing ? "#333" : "#4ADE80", color: finishing ? "#666" : "#000", border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 700, cursor: finishing ? "not-allowed" : "pointer", letterSpacing: "0.06em" }}>
                {finishing ? "Enregistrement…" : "✓ TERMINER LA SÉANCE"}
              </button>
            ) : (
              <button onClick={() => { playTransitionBeep(); setCurrentBlocIndex((i) => i + 1); }} style={{ width: "100%", padding: "16px", backgroundColor: "#B22222", color: "#fff", border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
                BLOC SUIVANT →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- Vue overview (avant démarrage) ---- */
  const totalExercices = allBlocs.reduce((sum, b) => sum + getBlocExs(b).length, 0);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#0D0D0D", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 1px" }}>{nomProgramme.toUpperCase()}</p>
            <p className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", letterSpacing: "0.04em", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(seanceName || seanceData.nom).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 0" }}>

        {/* Infos séance */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {seanceData.duree_estimee && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "5px 12px", borderRadius: 8 }}>⏱ {seanceData.duree_estimee} min</span>
          )}
          {seanceData.categorie && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "5px 12px", borderRadius: 8 }}>{seanceData.categorie}</span>
          )}
          {totalExercices > 0 && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "5px 12px", borderRadius: 8 }}>{totalExercices} exercice{totalExercices > 1 ? "s" : ""}</span>
          )}
          <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "5px 12px", borderRadius: 8 }}>{allBlocs.length} bloc{allBlocs.length > 1 ? "s" : ""}</span>
        </div>

        {/* Note de séance */}
        {seanceData.note && (
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <p className="font-body" style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, margin: 0 }}>{seanceData.note}</p>
          </div>
        )}

        {/* Blocs dépliables */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allBlocs.map((bloc, i) => {
            const color = BLOC_COLORS[bloc.type] ?? "#B22222";
            const label = BLOC_LABELS[bloc.type] ?? bloc.type.toUpperCase();
            const emoji = BLOC_EMOJIS[bloc.type] ?? "💪";
            const isOpen = openBlocs.has(i);

            return (
              <div key={bloc._key} style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, overflow: "hidden" }}>
                {/* Header accordion */}
                <button
                  onClick={() => toggleBloc(i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: color, letterSpacing: "0.08em", margin: "0 0 2px" }}>
                      {label} · {i + 1}/{allBlocs.length}
                    </p>
                    <p className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>{bloc.nom || label}</p>
                    {getBlocExs(bloc).length > 0 && (
                      <p className="font-body" style={{ fontSize: "0.7rem", color: "#555", margin: "2px 0 0" }}>{getBlocExs(bloc).length} exercice{getBlocExs(bloc).length > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Contenu déplié */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px" }}>
                    {bloc.instructions && (
                      <div className="font-body" style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: 12, padding: "10px 12px", backgroundColor: "#0D0D0D", borderRadius: 10 }}
                        dangerouslySetInnerHTML={{ __html: bloc.instructions }} />
                    )}
                    {getBlocExs(bloc).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {getBlocExs(bloc).map((ex) => (
                          <ExerciceCard
                            key={ex._key}
                            ex={ex}
                            done={false}
                            onVideoClick={ex.exercise?.video_url ? () => setVideoUrl(ex.exercise!.video_url!) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton démarrer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0D0D0D", borderTop: "1px solid #1a1a1a", padding: "16px", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={() => { initAudio(); requestWakeLock(); setCurrentBlocIndex(0); setStarted(true); }}
            style={{ width: "100%", padding: "16px", backgroundColor: "#B22222", color: "#fff", border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}
          >
            ▶ DÉMARRER LA SÉANCE
          </button>
        </div>
      </div>
    </div>
  );
}
