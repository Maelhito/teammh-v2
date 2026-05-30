"use client";

import { useState, useEffect, useCallback } from "react";
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
  exercise: { nom: string; video_url: string | null } | null;
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

const FORMAT_LABELS: Record<string, string> = {
  classique: "Classique", tabata: "Tabata", emom: "EMOM",
  amrap: "AMRAP", for_time: "For Time",
};
const BLOC_COLORS: Record<string, string> = {
  echauffement: "#F97316", corps: "#B22222", finisher: "#8B5CF6",
};
const BLOC_LABELS: Record<string, string> = {
  echauffement: "Échauffement", corps: "Corps", finisher: "Finisher",
};

function TimerDisplay({ seconds, label }: { seconds: number; label: string }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div style={{ textAlign: "center", padding: "14px 0" }}>
      <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: "#555", letterSpacing: "0.1em", margin: "0 0 8px" }}>{label}</p>
      <p className="font-title" style={{ fontSize: "3.5rem", color: remaining === 0 ? "#4ADE80" : "#F5F5F0", lineHeight: 1, margin: "0 0 12px", letterSpacing: "0.02em" }}>
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          onClick={() => setRunning((r) => !r)}
          style={{ padding: "10px 24px", borderRadius: 10, border: "none", backgroundColor: running ? "#333" : "#B22222", color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}
        >
          {remaining === 0 ? "✓ Terminé" : running ? "⏸ Pause" : remaining === seconds ? "▶ Démarrer" : "▶ Reprendre"}
        </button>
        <button
          onClick={() => { setRemaining(seconds); setRunning(false); }}
          style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: "0.88rem", cursor: "pointer" }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}

function ExerciceCard({ ex, done, onToggle }: { ex: RichExercise; done: boolean; onToggle: () => void }) {
  const nom = ex.exercise?.nom ?? "Exercice";
  const details: string[] = [];
  if (ex.series) details.push(`${ex.series} séries`);
  if (ex.repetitions) details.push(`${ex.repetitions} reps`);
  if (ex.duree_secondes) details.push(`${ex.duree_secondes}s`);
  if (ex.temps_repos) details.push(`Repos: ${ex.temps_repos}s`);

  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        backgroundColor: done ? "rgba(74,222,128,0.05)" : "#0D0D0D",
        border: `1px solid ${done ? "rgba(74,222,128,0.2)" : "#1a1a1a"}`,
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      {/* Miniature ou placeholder */}
      <div style={{ width: 44, height: 44, borderRadius: 9, overflow: "hidden", flexShrink: 0, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {ex.exercise?.miniature_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.exercise.miniature_url} alt={nom} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: done ? 0.4 : 1 }} />
        ) : (
          <span style={{ fontSize: "1.2rem", opacity: done ? 0.4 : 1 }}>💪</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-body" style={{ fontWeight: 700, fontSize: "0.88rem", color: done ? "#555" : "#F5F5F0", margin: 0, textDecoration: done ? "line-through" : "none" }}>{nom}</p>
        {details.length > 0 && (
          <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", margin: "3px 0 0" }}>{details.join(" · ")}</p>
        )}
        {ex.notes && <p className="font-body" style={{ fontSize: "0.7rem", color: "#444", margin: "2px 0 0", fontStyle: "italic" }}>{ex.notes}</p>}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#4ADE80" : "#2a2a2a"}`, backgroundColor: done ? "rgba(74,222,128,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>}
      </div>
    </button>
  );
}

function BlocCard({ bloc, blocIndex, totalBlocs, doneExercices, onToggleEx }: {
  bloc: Bloc; blocIndex: number; totalBlocs: number;
  doneExercices: Set<string>; onToggleEx: (key: string) => void;
}) {
  const [open, setOpen] = useState(blocIndex === 0);
  const color = BLOC_COLORS[bloc.type] ?? "#B22222";
  const totalEx = bloc.rich_exercices.length;
  const doneEx = bloc.rich_exercices.filter((e) => doneExercices.has(e._key)).length;
  const allDone = totalEx > 0 && doneEx === totalEx;

  // Timer secondes selon format
  let timerSeconds = 0;
  let timerLabel = "";
  if (bloc.format === "amrap") {
    timerSeconds = parseInt(bloc.amrap_duree || "10") * 60;
    timerLabel = `AMRAP ${bloc.amrap_duree || 10} min`;
  } else if (bloc.format === "for_time") {
    timerSeconds = parseInt(bloc.for_time_limit || "20") * 60;
    timerLabel = `For Time — limite ${bloc.for_time_limit || 20} min`;
  }

  return (
    <div style={{ backgroundColor: "#111111", border: `1px solid ${allDone ? "rgba(74,222,128,0.2)" : "#1a1a1a"}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      {/* Header bloc */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: allDone ? "rgba(74,222,128,0.12)" : `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "0.9rem" }}>{allDone ? "✓" : bloc.type === "echauffement" ? "🔥" : bloc.type === "finisher" ? "⚡" : "💪"}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="font-body" style={{ fontSize: "0.65rem", fontWeight: 700, color: allDone ? "#4ADE80" : color, letterSpacing: "0.08em", margin: "0 0 2px" }}>
            {BLOC_LABELS[bloc.type] ?? bloc.type} {blocIndex + 1}/{totalBlocs}
            {bloc.format !== "classique" && ` · ${FORMAT_LABELS[bloc.format] ?? bloc.format}`}
          </p>
          <p className="font-body" style={{ fontSize: "0.9rem", fontWeight: 700, color: allDone ? "#555" : "#F5F5F0", margin: 0 }}>{bloc.nom}</p>
        </div>
        {totalEx > 0 && (
          <span className="font-body" style={{ fontSize: "0.68rem", color: allDone ? "#4ADE80" : "#555", fontWeight: 700, flexShrink: 0 }}>{doneEx}/{totalEx}</span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {/* Instructions */}
          {bloc.instructions && (
            <div
              className="font-body"
              style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: 14, padding: "12px 14px", backgroundColor: "#0D0D0D", borderRadius: 10 }}
              dangerouslySetInnerHTML={{ __html: bloc.instructions }}
            />
          )}

          {/* Timer pour AMRAP / For Time */}
          {timerSeconds > 0 && (
            <div style={{ backgroundColor: "#0D0D0D", borderRadius: 12, marginBottom: 14, border: "1px solid #1a1a1a" }}>
              <TimerDisplay seconds={timerSeconds} label={timerLabel} />
            </div>
          )}

          {/* Timer Tabata */}
          {bloc.format === "tabata" && (
            <div style={{ backgroundColor: "#0D0D0D", borderRadius: 12, marginBottom: 14, border: "1px solid #1a1a1a" }}>
              <TimerDisplay seconds={parseInt(bloc.tabata_work || "20")} label={`WORK — ${bloc.tabata_work}s × ${bloc.tabata_tours} tours`} />
            </div>
          )}

          {/* Timer EMOM */}
          {bloc.format === "emom" && (
            <div style={{ backgroundColor: "#0D0D0D", borderRadius: 12, marginBottom: 14, border: "1px solid #1a1a1a" }}>
              <TimerDisplay
                seconds={parseInt(bloc.emom_interval_min || "1") * 60 + parseInt(bloc.emom_interval_sec || "0")}
                label={`EMOM — ${bloc.emom_rounds} rounds`}
              />
            </div>
          )}

          {/* Note de bloc */}
          {bloc.note_bloc && (
            <p className="font-body" style={{ fontSize: "0.78rem", color: "#666", fontStyle: "italic", margin: "0 0 12px" }}>{bloc.note_bloc}</p>
          )}

          {/* Exercices */}
          {bloc.rich_exercices.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bloc.rich_exercices.map((ex) => (
                <ExerciceCard
                  key={ex._key}
                  ex={ex}
                  done={doneExercices.has(ex._key)}
                  onToggle={() => onToggleEx(ex._key)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeanceViewer({
  assignmentId, gridKey, seanceData, seanceName, nomProgramme,
}: {
  assignmentId: string; gridKey: string;
  seanceData: SeanceData; seanceName: string; nomProgramme: string;
}) {
  const router = useRouter();
  const [doneExercices, setDoneExercices] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);

  const allBlocs = seanceData.blocs ?? [];
  const totalExercices = allBlocs.reduce((sum, b) => sum + b.rich_exercices.length, 0);
  const doneCount = doneExercices.size;

  const toggleEx = useCallback((key: string) => {
    setDoneExercices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  async function finirSeance() {
    setFinishing(true);
    try {
      await fetch("/api/entrainement/terminer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, gridKey }),
      });
    } catch {}
    setDone(true);
    setFinishing(false);
  }

  if (done) {
    return (
      <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: "4rem", marginBottom: 20 }}>🎉</div>
          <h1 className="font-title" style={{ fontSize: "2rem", color: "#F5F5F0", letterSpacing: "0.06em", margin: "0 0 12px" }}>SÉANCE TERMINÉE</h1>
          <p className="font-body" style={{ fontSize: "0.88rem", color: "#555", margin: "0 0 32px", lineHeight: 1.6 }}>
            Bravo ! Tu as complété {seanceName}.
          </p>
          <button
            onClick={() => router.push("/entrainement")}
            style={{ width: "100%", padding: "16px", backgroundColor: "#B22222", color: "#fff", border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}
          >
            RETOUR AUX SÉANCES
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {/* Header fixe */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#0D0D0D", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F5F5F0", flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#B22222", letterSpacing: "0.08em", margin: "0 0 1px" }}>{nomProgramme.toUpperCase()}</p>
            <p className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", letterSpacing: "0.04em", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(seanceName || seanceData.nom).toUpperCase()}
            </p>
          </div>
          {totalExercices > 0 && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: doneCount === totalExercices ? "#4ADE80" : "#555", flexShrink: 0 }}>
              {doneCount}/{totalExercices}
            </span>
          )}
        </div>
        {/* Barre progression globale */}
        {totalExercices > 0 && (
          <div style={{ height: 3, backgroundColor: "#1a1a1a" }}>
            <div style={{ height: "100%", width: `${(doneCount / totalExercices) * 100}%`, backgroundColor: "#B22222", transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 0" }}>
        {/* Infos séance */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {seanceData.duree_estimee && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "4px 10px", borderRadius: 8 }}>
              ⏱ {seanceData.duree_estimee} min
            </span>
          )}
          {seanceData.categorie && (
            <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "4px 10px", borderRadius: 8 }}>
              {seanceData.categorie}
            </span>
          )}
          <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", backgroundColor: "#111", border: "1px solid #1a1a1a", padding: "4px 10px", borderRadius: 8 }}>
            {allBlocs.length} bloc{allBlocs.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Note de séance */}
        {seanceData.note && (
          <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <p className="font-body" style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, margin: 0 }}>{seanceData.note}</p>
          </div>
        )}

        {/* Blocs */}
        {allBlocs.map((bloc, i) => (
          <BlocCard
            key={bloc._key}
            bloc={bloc}
            blocIndex={i}
            totalBlocs={allBlocs.length}
            doneExercices={doneExercices}
            onToggleEx={toggleEx}
          />
        ))}
      </div>

      {/* Bouton terminer fixe en bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0D0D0D", borderTop: "1px solid #1a1a1a", padding: "16px", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={finirSeance}
            disabled={finishing}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: finishing ? "#333" : "#B22222",
              color: finishing ? "#666" : "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: "1rem",
              fontWeight: 700,
              cursor: finishing ? "not-allowed" : "pointer",
              letterSpacing: "0.06em",
            }}
          >
            {finishing ? "Enregistrement…" : "✓ TERMINER LA SÉANCE"}
          </button>
        </div>
      </div>
    </div>
  );
}
