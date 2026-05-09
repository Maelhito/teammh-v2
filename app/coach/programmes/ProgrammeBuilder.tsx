"use client";

import { useState, useEffect, useCallback } from "react";
import { CATEGORIES, NIVEAUX } from "../seances/SeanceBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeanceRef {
  id: string;
  nom: string;
  categorie: string;
  niveau: string;
  duree_estimee: number | null;
  exercices_count: number;
}

// grid key = "S{semaine}_J{jour}" → tableau de seance IDs
export type Grid = Record<string, string[]>;

export interface ProgrammeData {
  nom: string;
  categorie: string;
  niveau: string;
  duree_semaines: number;
  note: string;
  grid: Grid;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DUREES = [2, 3, 4, 6, 8, 10, 12, 16, 20, 24];

export function gridKey(semaine: number, jour: number) { return `S${semaine}_J${jour}`; }

export function encodeProgData(d: ProgrammeData): string {
  return JSON.stringify({ grid: d.grid, note: d.note });
}

export function decodeProgData(prog: Record<string, unknown>): ProgrammeData {
  let grid: Grid = {};
  let note = "";
  try {
    const desc = prog.description as string || "";
    if (desc.startsWith("{")) { const p = JSON.parse(desc); grid = p.grid ?? {}; note = p.note ?? ""; }
    else note = desc;
  } catch {}
  return {
    nom: (prog.nom as string) || "",
    categorie: (prog.categorie as string) || "full_body",
    niveau: (prog.niveau as string) || "debutant",
    duree_semaines: (prog.duree_semaines as number) || 4,
    note,
    grid,
  };
}

function catLabel(v: string) { return CATEGORIES.find(c => c.value === v)?.label ?? v; }
function nivLabel(v: string) { return NIVEAUX.find(n => n.value === v)?.label ?? v; }

// ─── Couleurs niveau ──────────────────────────────────────────────────────────
const NIV_COLORS: Record<string, string> = {
  debutant: "#10B981", intermediaire: "#F59E0B", avance: "#EF4444",
};

// ─── Panel séances disponibles ────────────────────────────────────────────────
function SeancesPanel({ seances, onAdd }: {
  seances: SeanceRef[];
  onAdd: (seance: SeanceRef, semaine: number, jour: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("tous");
  const filtered = seances.filter(s => {
    if (filterCat !== "tous" && s.categorie !== filterCat) return false;
    if (search && !s.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "system-ui" }}>Mes séances</p>
        <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 11, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", marginBottom: 5 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 10, fontFamily: "system-ui", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
          <option value="tous">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: 11, color: "#444", padding: "16px 14px", fontFamily: "system-ui" }}>Aucune séance trouvée</p>
        )}
        {filtered.map(s => {
          const nColor = NIV_COLORS[s.niveau] ?? "#888";
          return (
            <div key={s.id} draggable
              onDragStart={e => { e.dataTransfer.setData("source", "seance"); e.dataTransfer.setData("seanceData", JSON.stringify(s)); }}
              style={{ padding: "9px 14px", borderBottom: "1px solid #111", cursor: "grab", backgroundColor: "#0D0D0D" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D0D"}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: "#F5F5F0", margin: "0 0 3px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nom}</p>
              <div style={{ display: "flex", gap: 5 }}>
                {s.categorie && <span style={{ fontSize: 8, color: "#888", fontFamily: "system-ui" }}>{catLabel(s.categorie)}</span>}
                {s.niveau && <span style={{ fontSize: 8, fontWeight: 700, color: nColor, fontFamily: "system-ui" }}>· {nivLabel(s.niveau)}</span>}
                {s.duree_estimee && <span style={{ fontSize: 8, color: "#555", fontFamily: "system-ui" }}>· {s.duree_estimee}min</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "7px 14px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 8, color: "#333", margin: 0, fontFamily: "system-ui" }}>⠿ Glisse dans la grille pour planifier</p>
      </div>
    </div>
  );
}

// ─── Cellule jour ─────────────────────────────────────────────────────────────
function DayCell({ semaine, jour, seanceIds, allSeances, onDrop, onRemove }: {
  semaine: number; jour: number;
  seanceIds: string[];
  allSeances: SeanceRef[];
  onDrop: (s: SeanceRef, semaine: number, jour: number) => void;
  onRemove: (seanceId: string, semaine: number, jour: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const seances = seanceIds.map(id => allSeances.find(s => s.id === id)).filter(Boolean) as SeanceRef[];

  return (
    <div
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault(); setHover(false);
        if (e.dataTransfer.getData("source") !== "seance") return;
        try { onDrop(JSON.parse(e.dataTransfer.getData("seanceData")), semaine, jour); } catch {}
      }}
      style={{
        minHeight: 60, borderRadius: 6, padding: "4px 5px",
        border: hover ? "1.5px dashed #B22222" : "1px solid #efefef",
        backgroundColor: hover ? "rgba(178,34,34,0.04)" : seances.length > 0 ? "#fafafa" : "#fff",
        transition: "all 0.1s",
      }}
    >
      {seances.map(s => {
        const nColor = NIV_COLORS[s.niveau] ?? "#B22222";
        return (
          <div key={s.id} style={{
            marginBottom: 3, padding: "4px 6px", borderRadius: 5,
            backgroundColor: "#fff", border: `1px solid ${nColor}20`,
            borderLeft: `3px solid ${nColor}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>{s.nom}</p>
              <button onClick={() => onRemove(s.id, semaine, jour)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
            </div>
            {s.duree_estimee && <p style={{ fontSize: 8, color: "#aaa", margin: "2px 0 0", fontFamily: "system-ui" }}>⏱ {s.duree_estimee} min</p>}
          </div>
        );
      })}
      {seances.length === 0 && hover && (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, color: "#B22222" }}>+</span>
        </div>
      )}
    </div>
  );
}

// ─── Grille programmation ─────────────────────────────────────────────────────
function ProgrammeGrid({ data, seances, onChange }: {
  data: ProgrammeData;
  seances: SeanceRef[];
  onChange: (grid: Grid) => void;
}) {
  function addToCell(seance: SeanceRef, semaine: number, jour: number) {
    const key = gridKey(semaine, jour);
    const existing = data.grid[key] ?? [];
    if (existing.includes(seance.id)) return; // déjà là
    onChange({ ...data.grid, [key]: [...existing, seance.id] });
  }

  function removeFromCell(seanceId: string, semaine: number, jour: number) {
    const key = gridKey(semaine, jour);
    const next = (data.grid[key] ?? []).filter(id => id !== seanceId);
    const newGrid = { ...data.grid };
    if (next.length === 0) delete newGrid[key]; else newGrid[key] = next;
    onChange(newGrid);
  }

  const weeks = Array.from({ length: data.duree_semaines }, (_, i) => i + 1);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* En-tête jours */}
      <div style={{ display: "grid", gridTemplateColumns: `80px repeat(7, minmax(110px, 1fr))`, gap: 4, marginBottom: 4, minWidth: 860 }}>
        <div />
        {JOURS.map(j => (
          <div key={j} style={{ textAlign: "center", padding: "6px 0" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>{j}</span>
          </div>
        ))}
      </div>

      {/* Lignes semaines */}
      {weeks.map(s => (
        <div key={s} style={{ display: "grid", gridTemplateColumns: `80px repeat(7, minmax(110px, 1fr))`, gap: 4, marginBottom: 4, minWidth: 860 }}>
          {/* Label semaine */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "#aaa", margin: 0, fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sem.</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", lineHeight: 1 }}>{s}</p>
            </div>
          </div>

          {/* Cellules jours */}
          {JOURS.map((_, j) => (
            <DayCell
              key={j}
              semaine={s} jour={j + 1}
              seanceIds={data.grid[gridKey(s, j + 1)] ?? []}
              allSeances={seances}
              onDrop={addToCell}
              onRemove={removeFromCell}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Builder complet ──────────────────────────────────────────────────────────
export interface ProgrammeBuilderProps {
  data: ProgrammeData;
  onChange: (data: ProgrammeData) => void;
}

export default function ProgrammeBuilder({ data, onChange }: ProgrammeBuilderProps) {
  const [seances, setSeances] = useState<SeanceRef[]>([]);

  useEffect(() => {
    fetch("/api/coach/seances")
      .then(r => r.json())
      .then(d => {
        const list = (d.seances ?? []).map((s: Record<string, unknown>) => {
          let categorie = "", niveau = "";
          try {
            const desc = s.description as string || "";
            if (desc.startsWith("{")) { const p = JSON.parse(desc); categorie = p.categorie ?? ""; niveau = p.niveau ?? ""; }
          } catch {}
          return { id: s.id, nom: s.nom, categorie, niveau, duree_estimee: s.duree_estimee ?? null, exercices_count: s.exercices_count ?? 0 };
        });
        setSeances(list);
      });
  }, []);

  const totalSeances = Object.values(data.grid).reduce((acc, ids) => acc + ids.length, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 520, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
      <SeancesPanel seances={seances} onAdd={(s, sem, jour) => {
        const key = gridKey(sem, jour);
        const existing = data.grid[key] ?? [];
        if (!existing.includes(s.id)) onChange({ ...data, grid: { ...data.grid, [key]: [...existing, s.id] } });
      }} />
      <div style={{ backgroundColor: "#f9f9f9", padding: "16px", overflowY: "auto" }}>
        {/* Config durée + note */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px", fontFamily: "system-ui" }}>Durée du programme</p>
            <select value={data.duree_semaines} onChange={e => onChange({ ...data, duree_semaines: parseInt(e.target.value) })}
              style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 13, fontFamily: "system-ui", outline: "none", cursor: "pointer" }}>
              {DUREES.map(d => <option key={d} value={d}>{d} semaines</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px", fontFamily: "system-ui" }}>Description / objectif</p>
            <input value={data.note} onChange={e => onChange({ ...data, note: e.target.value })} placeholder="Ex: Programme de remise en forme progressive sur 8 semaines…"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 12, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }} />
          </div>
          <p style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui", margin: 0 }}>
            {totalSeances} séance{totalSeances > 1 ? "s" : ""} planifiée{totalSeances > 1 ? "s" : ""}
          </p>
        </div>

        {/* Grille */}
        <ProgrammeGrid data={data} seances={seances} onChange={grid => onChange({ ...data, grid })} />
      </div>
    </div>
  );
}
