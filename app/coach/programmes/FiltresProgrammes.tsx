"use client";

// Les mêmes filtres, aux deux endroits où l'on cherche un programme : la liste
// « Mes programmes » et la modale « Assigner un programme » d'une cliente.
// Ils vivaient uniquement dans la page liste ; les dupliquer aurait garanti
// qu'un jour les deux écrans ne filtrent plus pareil.

import { NIVEAUX } from "../seances/SeanceBuilder";
import {
  PROG_CATEGORIES, AVANCEMENTS, CYCLE_PROGS,
  estCycle, normaliseProgCategorie, normaliseAvancement, normaliseCycleProg,
} from "./constantes";

/** Le strict minimum d'un programme pour être filtré. */
export interface ProgrammeFiltrable {
  categorie?: string | null;
  niveau?: string | null;
  description?: string | null;
}

export interface Filtres { cat: string; avc: string; prog: string; niv: string }

export const FILTRES_TOUS: Filtres = { cat: "tous", avc: "tous", prog: "tous", niv: "tous" };

export function aucunFiltre(f: Filtres) {
  return f.cat === "tous" && f.avc === "tous" && f.prog === "tous" && f.niv === "tous";
}

/** L'avancement est rangé dans le JSON de description, pas dans une colonne. */
export function avancementDe(description: string | null | undefined): { avancement: string; cycleProg: string } {
  try {
    if (!description?.startsWith("{")) return { avancement: "", cycleProg: "" };
    const p = JSON.parse(description);
    const avancement = normaliseAvancement(p.avancement);
    return { avancement, cycleProg: normaliseCycleProg(p.cycle_prog, avancement) };
  } catch { return { avancement: "", cycleProg: "" }; }
}

export function correspondAuxFiltres(p: ProgrammeFiltrable, f: Filtres): boolean {
  if (f.cat !== "tous" && normaliseProgCategorie(p.categorie) !== f.cat) return false;
  const a = avancementDe(p.description);
  if (f.avc !== "tous" && a.avancement !== f.avc) return false;
  if (f.prog !== "tous" && a.cycleProg !== f.prog) return false;
  if (f.niv !== "tous" && p.niveau !== f.niv) return false;
  return true;
}

export function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  const active = value !== "tous";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#B22222" : "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          appearance: "none", WebkitAppearance: "none", width: "100%",
          padding: "10px 36px 10px 14px", borderRadius: 8, cursor: "pointer",
          fontFamily: "system-ui", fontSize: 13, fontWeight: active ? 700 : 400,
          border: active ? "2px solid #B22222" : "1px solid #ddd",
          backgroundColor: active ? "rgba(178,34,34,0.04)" : "#fff",
          color: active ? "#B22222" : "#555", outline: "none", boxSizing: "border-box",
          boxShadow: active ? "0 1px 6px rgba(178,34,34,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <option value="tous">Tous</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: active ? "#B22222" : "#bbb", pointerEvents: "none" }}>▼</span>
      </div>
    </div>
  );
}

/**
 * Les quatre listes déroulantes. `variant="compact"` les range sur deux
 * colonnes, pour tenir dans la modale d'assignation.
 *
 * « Prog » n'apparaît que si l'avancement retenu est un cycle : c'est la même
 * règle que dans le formulaire du programme (un prog sans cycle n'existe pas).
 */
export function FiltresProgrammes({ filtres, onChange, variant = "page" }: {
  filtres: Filtres; onChange: (f: Filtres) => void; variant?: "page" | "compact";
}) {
  const compact = variant === "compact";
  function set(patch: Partial<Filtres>) { onChange({ ...filtres, ...patch }); }

  const champ = (node: React.ReactNode, base: number, max: number) =>
    compact ? node : <div style={{ flex: `1 1 ${base}px`, maxWidth: max }}>{node}</div>;

  return (
    <div style={compact
      ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }
      : { display: "flex", gap: 14, flexWrap: "wrap" }}>
      {champ(<FilterDropdown label="Catégorie" options={PROG_CATEGORIES} value={filtres.cat} onChange={v => set({ cat: v })} />, 180, 240)}
      {champ(
        <FilterDropdown label="Avancement" options={AVANCEMENTS} value={filtres.avc}
          onChange={v => set({ avc: v, ...(estCycle(v) ? {} : { prog: "tous" }) })} />,
        180, 240,
      )}
      {estCycle(filtres.avc) && champ(
        <FilterDropdown label="Prog" options={CYCLE_PROGS} value={filtres.prog} onChange={v => set({ prog: v })} />,
        140, 180,
      )}
      {champ(<FilterDropdown label="Niveau" options={NIVEAUX} value={filtres.niv} onChange={v => set({ niv: v })} />, 180, 240)}
      {!aucunFiltre(filtres) && (
        <div style={{ display: "flex", alignItems: "flex-end", ...(compact ? { gridColumn: "1 / -1" } : {}) }}>
          <button onClick={() => onChange(FILTRES_TOUS)}
            style={{ width: compact ? "100%" : undefined, padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#fafafa", fontSize: 12, color: "#999", cursor: "pointer", fontFamily: "system-ui" }}>
            ✕ Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
