"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { decodeProgData, type Grid, type CellItem } from "../../programmes/ProgrammeBuilder";
import SeanceBuildComp, { type SeanceData } from "../../seances/SeanceBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cliente { id: string; email: string; prenom: string | null; nom: string | null; statut: string; date_demarrage: string | null; }
interface Programme { id: string; nom: string; niveau: string; duree_semaines: number; description: string | null; }
interface CalendarEvent {
  id: string; titre: string; date: string; heure: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  message: string | null; lien: string | null; rappel: boolean;
  created_by: "admin" | "cliente";
  event_type: "coach" | "nutrition" | "coaching_groupe" | "seance" | "tache" | null;
  target_user_id: string | null;
}
interface Assignment {
  id: string; user_id: string; programme_id: string; date_debut: string;
  statut: "en_cours" | "termine" | "pause"; seances_effectuees: number;
  grid_data: string | null; programme: Programme;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const JOURS_COURT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const JOURS_LONG  = ["—", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS_LONG   = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const NIV: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function decodeGrid(description: string | null): Grid {
  if (!description?.startsWith("{")) return {};
  try { return JSON.parse(description).grid ?? {}; } catch { return {}; }
}
// Parse une date "YYYY-MM-DD" en heure locale (évite le décalage UTC)
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateToGridKey(date: Date, dateDebut: Date, dureeSemaines: number): string | null {
  // Comparer en jours entiers locaux pour éviter les décalages DST
  const d1 = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate());
  const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
  if (diffDays < 0) return null;
  const semaine = Math.floor(diffDays / 7) + 1;
  if (semaine > dureeSemaines) return null;
  const dow = date.getDay();
  return `S${semaine}_J${dow === 0 ? 7 : dow}`;
}
function getSeancesForKey(grid: Grid, key: string | null): CellItem[] {
  if (!key) return [];
  return grid[key] ?? [];
}
function getItemName(item: CellItem): string {
  if (item.type === "seance") return item.seanceName;
  if (item.type === "seance_locale") return item.nom;
  return item.titre;
}
let _k = 0;
function nk() { return `ci${++_k}_${Date.now()}`; }

function isEventOnDay(ev: CalendarEvent, day: Date): boolean {
  const evDate = new Date(ev.date + "T00:00:00");
  evDate.setHours(0, 0, 0, 0);
  if (evDate > day) return false;
  switch (ev.recurrence) {
    case "none":    return evDate.toDateString() === day.toDateString();
    case "daily":   return true;
    case "weekly":  return evDate.getDay() === day.getDay();
    case "monthly": return evDate.getDate() === day.getDate();
    default:        return false;
  }
}
// Palette couleurs par type d'événement
const EV_COLORS: Record<string, string> = {
  seance:          "#F97316", // 🟠 Séance de sport
  coach:           "#B22222", // 🔴 Rendez-vous coach
  nutrition:       "#22C55E", // 🟢 Nutrition
  coaching_groupe: "#3B82F6", // 🔵 Coaching de groupe
  tache:           "#8B5CF6", // 🟣 Tâche
};
const EV_LABELS: Record<string, string> = {
  seance:          "Séance de sport",
  coach:           "Rendez-vous coach",
  nutrition:       "Nutrition",
  coaching_groupe: "Coaching de groupe",
  tache:           "Tâche",
};

function evColor(ev: CalendarEvent): string {
  if (ev.created_by === "cliente") return "#7C3AED";
  return EV_COLORS[ev.event_type ?? ""] ?? "#B22222";
}
function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Edit panel ───────────────────────────────────────────────────────────────
function SeanceEditPanel({ item, cellKey, dureeSemaines, otherInstancesCount, onSave, onDelete, onClose }: {
  item: CellItem; cellKey: string; dureeSemaines: number; otherInstancesCount: number;
  onSave: (updatedItem: CellItem, newCellKey: string, applyToAll: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const match = cellKey.match(/^S(\d+)_J(\d+)$/);
  const initSem = parseInt(match?.[1] ?? "1");
  const initJour = parseInt(match?.[2] ?? "1");

  const [semaine, setSemaine] = useState(initSem);
  const [jour, setJour] = useState(initJour);
  const [seanceData, setSeanceData] = useState<SeanceData | null>(
    item.type === "seance_locale" ? item.seanceData : null
  );
  const [nom, setNom] = useState(
    item.type === "seance" ? item.seanceName :
    item.type === "seance_locale" ? item.nom :
    item.type === "video" ? item.titre : ""
  );
  const [videoUrl, setVideoUrl] = useState(item.type === "video" ? item.url : "");

  function buildUpdated(): CellItem {
    if (item.type === "seance_locale")
      return { ...item, nom, duree: parseInt(seanceData?.duree_estimee ?? "") || item.duree, seanceData: seanceData ?? item.seanceData };
    if (item.type === "seance") return { ...item, seanceName: nom };
    return { ...item, titre: nom, url: videoUrl };
  }

  function handleSave(applyToAll: boolean) {
    onSave(buildUpdated(), `S${semaine}_J${jour}`, applyToAll);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(860px, 96vw)", backgroundColor: "#0D0D0D", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "#B22222", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
              {item.type === "video" ? "Vidéo" : item.type === "seance" ? "Séance bibliothèque" : "Séance locale"}
              {" — "}Sem. {initSem} · {JOURS_LONG[initJour]}
            </p>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{nom || "Sans nom"}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onDelete} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>🗑 Supprimer</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕</button>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Nom */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Nom</label>
              <input style={inp} value={nom} onChange={e => setNom(e.target.value)} />
            </div>
            {/* Semaine */}
            <div>
              <label style={lbl}>Semaine</label>
              <input style={{ ...inp, textAlign: "center" }} type="number" min={1} max={dureeSemaines} value={semaine} onChange={e => setSemaine(Math.min(dureeSemaines, Math.max(1, parseInt(e.target.value) || 1)))} />
            </div>
            {/* Jour */}
            <div>
              <label style={lbl}>Jour</label>
              <select style={{ ...inp, cursor: "pointer" }} value={jour} onChange={e => setJour(parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7].map(j => <option key={j} value={j}>{JOURS_LONG[j]}</option>)}
              </select>
            </div>
            {/* Durée si séance */}
            {item.type !== "video" && (
              <div>
                <label style={lbl}>Durée (min)</label>
                <input style={{ ...inp, textAlign: "center" }} type="number" min={1}
                  value={seanceData?.duree_estimee ?? (item.type === "seance" ? item.duree ?? "" : item.type === "seance_locale" ? item.duree ?? "" : "")}
                  onChange={e => seanceData && setSeanceData(d => d ? { ...d, duree_estimee: e.target.value } : d)}
                  readOnly={item.type === "seance"}
                />
              </div>
            )}
            {/* URL vidéo */}
            {item.type === "video" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>URL YouTube</label>
                <input style={inp} type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
              </div>
            )}
          </div>

          {/* Séance locale → SeanceBuilder */}
          {item.type === "seance_locale" && seanceData && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "system-ui" }}>Exercices & blocs</p>
              <SeanceBuildComp data={seanceData} onChange={setSeanceData} />
            </div>
          )}
          {item.type === "seance" && (
            <div style={{ padding: "14px 16px", borderRadius: 8, backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
              <p style={{ fontSize: 11, color: "#555", margin: 0, fontFamily: "system-ui" }}>
                Cette séance est liée à ta bibliothèque. Pour modifier ses exercices, édite-la depuis l'onglet Séances.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
          {otherInstancesCount > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 10, color: "#555", margin: 0, fontFamily: "system-ui", textAlign: "center" }}>
                {otherInstancesCount} autre{otherInstancesCount > 1 ? "s" : ""} séance{otherInstancesCount > 1 ? "s" : ""} "{nom}" trouvée{otherInstancesCount > 1 ? "s" : ""} dans le programme
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleSave(false)}
                  style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1px solid #2a2a2a", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui" }}>
                  Cette séance uniquement
                </button>
                <button onClick={() => handleSave(true)}
                  style={{ flex: 1, padding: "11px", borderRadius: 9, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                  ✅ Toutes ({otherInstancesCount + 1})
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => handleSave(false)}
              style={{ width: "100%", padding: "12px", borderRadius: 9, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
              ✅ Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal ajout événement / tâche ────────────────────────────────────────────
type EvTab = "evenement" | "tache";
interface TeamInfo {
  coach:     { id: string; nom: string; titre: string; lien_zoom: string | null } | null;
  nutrition: { id: string; nom: string; titre: string; lien_zoom: string | null } | null;
}

function AddEvenementModal({ clienteId, defaultDate, onAdded, onClose }: {
  clienteId: string; defaultDate: string; onAdded: (ev: CalendarEvent) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<EvTab>("evenement");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [team, setTeam] = useState<TeamInfo>({ coach: null, nutrition: null });

  const [evForm, setEvForm] = useState({
    titre: "", date: defaultDate, heure: "",
    recurrence: "none", event_type: "coach",
    message: "", lien: "", rappel: false, rappel_minutes: 0,
  });
  const [tacheForm, setTacheForm] = useState({ titre: "", date: defaultDate, description: "" });

  // Charge les coachs assignés à cette cliente + leur lien Zoom
  useEffect(() => {
    fetch(`/api/coach/clientes/${clienteId}/team`)
      .then(r => r.json())
      .then(d => {
        setTeam(d);
        // Pré-remplir avec le lien du coach si disponible
        if (d.coach?.lien_zoom) {
          setEvForm(f => ({ ...f, lien: d.coach.lien_zoom }));
        } else {
          // Fallback : lien Zoom du coach connecté
          import("@/lib/supabase").then(({ createSupabaseBrowserClient }) => {
            const sb = createSupabaseBrowserClient();
            sb.auth.getUser().then(({ data: { user } }) => {
              const zoom = user?.user_metadata?.lien_zoom;
              if (zoom) setEvForm(f => ({ ...f, lien: zoom }));
            });
          });
        }
      })
      .catch(() => {});
  }, [clienteId]);

  // Quand le type change, mettre à jour le lien automatiquement
  function handleTypeChange(type: string) {
    let lien = evForm.lien;
    if (type === "coach" && team.coach?.lien_zoom)         lien = team.coach.lien_zoom;
    if (type === "nutrition" && team.nutrition?.lien_zoom)  lien = team.nutrition.lien_zoom;
    if (type === "coaching_groupe")                         lien = evForm.lien; // garde le lien actuel
    setEvForm(f => ({ ...f, event_type: type, lien }));
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", color: "#1a1a1a", backgroundColor: "#fff" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui" };

  async function handleSave() {
    const body = tab === "tache"
      ? { titre: tacheForm.titre, date: tacheForm.date, message: tacheForm.description || null, heure: null, recurrence: "none", event_type: "tache", rappel: false, rappel_minutes: 0, lien: null }
      : { ...evForm, heure: evForm.heure || null };

    if (!body.titre) { setError("Titre requis"); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/coach/clientes/${clienteId}/evenements`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { event } = await res.json();
      onAdded(event);
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erreur");
      setSaving(false);
    }
  }

  const TABS: { key: EvTab; label: string }[] = [
    { key: "evenement", label: "Événement" },
    { key: "tache",     label: "Tâche" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, backgroundColor: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#1a1a1a", fontFamily: "system-ui" }}>Ajouter au calendrier</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: 18 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: "8px 4px", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #B22222" : "2px solid transparent",
              color: tab === t.key ? "#B22222" : "#aaa",
              fontWeight: tab === t.key ? 700 : 400, fontSize: 12,
              cursor: "pointer", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "evenement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={lbl}>Titre *</label>
              <input style={inp} placeholder="Ex : Rendez-vous coach" value={evForm.titre} onChange={e => setEvForm(f => ({ ...f, titre: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={lbl}>Date *</label>
                <input type="date" style={inp} value={evForm.date} onChange={e => setEvForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div><label style={lbl}>Heure</label>
                <input type="time" style={{ ...inp, color: evForm.heure ? "#1a1a1a" : "#bbb" }} value={evForm.heure} onChange={e => setEvForm(f => ({ ...f, heure: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={lbl}>Type de rendez-vous</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { type: "coach",           label: "🔴 Coach",              info: team.coach     ? `${team.coach.nom}${team.coach.lien_zoom ? " · 🔗 Zoom prêt" : " · ⚠️ Pas de lien Zoom"}` : "Aucun coach attitré", color: "#B22222" },
                  { type: "nutrition",       label: "🟢 Nutrition",           info: team.nutrition ? `${team.nutrition.nom}${team.nutrition.lien_zoom ? " · 🔗 Zoom prêt" : " · ⚠️ Pas de lien Zoom"}` : "Aucun coach nutrition attitré", color: "#22C55E" },
                  { type: "coaching_groupe", label: "🔵 Coaching de groupe",  info: "Lien à renseigner manuellement", color: "#3B82F6" },
                ].map(({ type, label, info, color }) => {
                  const active = evForm.event_type === type;
                  return (
                    <button key={type} type="button" onClick={() => handleTypeChange(type)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `2px solid ${active ? color : "#e8e8e8"}`, backgroundColor: active ? `${color}08` : "#fafafa", cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: active ? color : "#555", margin: "0 0 2px", fontFamily: "system-ui" }}>{label}</p>
                      <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>{info}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div><label style={lbl}>Récurrence</label>
              <select style={{ ...inp, cursor: "pointer" }} value={evForm.recurrence} onChange={e => setEvForm(f => ({ ...f, recurrence: e.target.value }))}>
                <option value="none">Sans récurrence</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
                <option value="daily">Quotidienne</option>
              </select>
            </div>
            <div><label style={lbl}>Message</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "none" }} placeholder="Optionnel" value={evForm.message} onChange={e => setEvForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div><label style={lbl}>Lien (zoom, etc.)</label>
              <input type="url" style={inp} placeholder="https://…" value={evForm.lien} onChange={e => setEvForm(f => ({ ...f, lien: e.target.value }))} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={evForm.rappel} onChange={e => setEvForm(f => ({ ...f, rappel: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#B22222" }} />
              <span style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>🔔 Rappel push la veille</span>
            </label>
          </div>
        )}

        {tab === "tache" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={lbl}>Titre *</label>
              <input style={inp} placeholder="Ex : Préparer son bilan" value={tacheForm.titre} onChange={e => setTacheForm(f => ({ ...f, titre: e.target.value }))} />
            </div>
            <div><label style={lbl}>Date *</label>
              <input type="date" style={inp} value={tacheForm.date} onChange={e => setTacheForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div><label style={lbl}>Description</label>
              <textarea style={{ ...inp, minHeight: 90, resize: "none" }} placeholder="Optionnel" value={tacheForm.description} onChange={e => setTacheForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>✗ {error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #eee", background: "#fafafa", fontSize: 13, color: "#555", cursor: "pointer", fontFamily: "system-ui" }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", backgroundColor: saving ? "#eee" : "#B22222", color: saving ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
            {saving ? "Enregistrement…" : tab === "tache" ? "✅ Ajouter la tâche" : "✅ Créer l'événement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendrier mensuel avec drag & drop ──────────────────────────────────────
function MonthCalendar({ grid, activeStart, dureeSemaines, today, events, onEditItem, onMoveItem, onAddEvent, onEventClick }: {
  grid: Grid; activeStart: Date | null; dureeSemaines: number; today: Date;
  events: CalendarEvent[];
  onEditItem: (cellKey: string, item: CellItem) => void;
  onMoveItem: (fromKey: string, itemKey: string, toKey: string) => void;
  onAddEvent: (date: Date) => void;
  onEventClick?: (ev: CalendarEvent) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragRef = useRef<{ cellKey: string; itemKey: string } | null>(null);

  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const month = base.getMonth();
  const year = base.getFullYear();
  const firstDay = new Date(year, month, 1);

  const startDay = new Date(firstDay);
  const dow = firstDay.getDay();
  startDay.setDate(firstDay.getDate() - (dow === 0 ? 6 : dow - 1));

  const cells: Date[] = [];
  const cursor = new Date(startDay);
  while (cells.length < 42) { cells.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "18px", marginBottom: 16 }}>
      {/* Ligne 1 : titre + légende */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui" }}>Calendrier</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: "2px 0 0", fontFamily: "system-ui" }}>{MOIS_LONG[month]} {year}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(EV_LABELS).map(([type, label]) => (
            <span key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#666", fontFamily: "system-ui" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: EV_COLORS[type], display: "inline-block", flexShrink: 0 }} />
              {label}
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#666", fontFamily: "system-ui" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#7C3AED", display: "inline-block", flexShrink: 0 }} />
            Cliente
          </span>
        </div>
      </div>
      {/* Ligne 2 : navigation mois + bouton ajouter */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #efefef", background: "#fafafa", cursor: "pointer", fontSize: 13 }}>‹</button>
        <button onClick={() => setMonthOffset(0)} disabled={monthOffset === 0} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #efefef", background: monthOffset === 0 ? "#f0f0f0" : "#fafafa", cursor: monthOffset === 0 ? "default" : "pointer", fontSize: 11, color: "#888", fontFamily: "system-ui" }}>Ce mois</button>
        <button onClick={() => setMonthOffset(o => o + 1)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #efefef", background: "#fafafa", cursor: "pointer", fontSize: 13 }}>›</button>
        <button onClick={() => onAddEvent(new Date(year, month, today.getMonth() === month && today.getFullYear() === year ? today.getDate() : 1))}
          style={{ marginLeft: 4, padding: "6px 12px", borderRadius: 7, border: "none", background: "#B22222", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 4 }}>
          + Ajouter
        </button>
      </div>

      <div className="coach-month-scroll"><div className="coach-month-inner">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {JOURS_COURT.slice(1).concat(JOURS_COURT[0]).map(j => (
          <div key={j} style={{ textAlign: "center", padding: "4px 0" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "system-ui" }}>{j}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(44px, 1fr))", gap: 3 }}>
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const cellKey = activeStart ? dateToGridKey(day, activeStart, dureeSemaines) : null;
          const items = getSeancesForKey(grid, cellKey);
          const isDragTarget = dragOver === cellKey && cellKey !== null;
          const dayEvents = events.filter(ev => isEventOnDay(ev, day));

          return (
            <div key={i}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (cellKey) setDragOver(cellKey); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
              onDrop={e => {
                e.preventDefault(); setDragOver(null);
                if (!cellKey || !dragRef.current || dragRef.current.cellKey === cellKey) return;
                onMoveItem(dragRef.current.cellKey, dragRef.current.itemKey, cellKey);
                dragRef.current = null;
              }}
              style={{
                borderRadius: 8, minHeight: 72, padding: "6px 5px",
                border: isDragTarget ? "2px dashed #B22222" : isToday ? "2px solid #B22222" : "1px solid #f0f0f0",
                backgroundColor: isDragTarget ? "rgba(178,34,34,0.06)" : isToday ? "rgba(178,34,34,0.03)" : !isCurrentMonth ? "#fafafa" : "#fff",
                opacity: !isCurrentMonth ? 0.4 : 1,
                transition: "border 0.1s, background 0.1s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", flex: 1 }}>
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span key={j} title={ev.titre} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: evColor(ev), display: "inline-block", flexShrink: 0 }} />
                  ))}
                </div>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isToday ? "#B22222" : "transparent", fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? "#fff" : isPast ? "#bbb" : "#1a1a1a", fontFamily: "system-ui" }}>
                  {day.getDate()}
                </span>
              </div>
              {dayEvents.map(ev => (
                <div key={ev.id} onClick={() => onEventClick?.(ev)} style={{ padding: "2px 5px", borderRadius: 4, marginBottom: 2, backgroundColor: `${evColor(ev)}15`, borderLeft: `2px solid ${evColor(ev)}`, cursor: "pointer" }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: evColor(ev), margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.titre}</p>
                </div>
              ))}
              {items.map(item => {
                const label = item.type === "seance" ? item.seanceName : item.type === "seance_locale" ? item.nom : `🎬 ${item.titre}`;
                return (
                  <div key={item._key}
                    draggable
                    onDragStart={() => { if (cellKey) dragRef.current = { cellKey, itemKey: item._key }; }}
                    onDragEnd={() => setDragOver(null)}
                    onClick={() => { if (cellKey) onEditItem(cellKey, item); }}
                    title="Cliquer pour modifier · Glisser pour déplacer"
                    style={{ padding: "3px 5px", borderRadius: 4, marginBottom: 2, cursor: "grab", userSelect: "none", backgroundColor: isPast ? "#f5f5f5" : item.type === "video" ? "rgba(139,92,246,0.06)" : "rgba(249,115,22,0.06)", borderLeft: `2px solid ${isPast ? "#ddd" : item.type === "video" ? "#8B5CF6" : "#F97316"}`, transition: "opacity 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "0.75"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                  >
                    <p style={{ fontSize: 8, fontWeight: 700, color: isPast ? "#bbb" : item.type === "video" ? "#7c3aed" : "#F97316", margin: 0, fontFamily: "system-ui", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{label}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div></div>{/* /coach-month-inner /coach-month-scroll */}
    </div>
  );
}

// ─── Journal séances (notes post-séance) ─────────────────────────────────────
interface SeanceLog {
  id: string; seance_nom: string | null; completed_at: string;
  duration_min: number | null; note_etoiles: number | null; note_texte: string | null;
}

function JournalSeances({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<SeanceLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    const res = await fetch(`/api/coach/clientes/${clienteId}/journal`);
    const d = await res.json();
    setLogs(d.logs ?? []);
    setLoaded(true);
  }

  function handleToggle() {
    setOpen(o => !o);
    if (!loaded) load();
  }

  if (!open && !loaded) {
    return (
      <div style={{ marginTop: 8, borderRadius: 12, border: "1px solid #efefef", overflow: "hidden", backgroundColor: "#fff" }}>
        <button onClick={handleToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>Journal des séances</span>
          <span style={{ fontSize: 12, color: "#ccc" }}>▼</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, borderRadius: 12, border: "1px solid #efefef", overflow: "hidden", backgroundColor: "#fff" }}>
      <button onClick={handleToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Journal des séances {loaded && logs.length > 0 ? `(${logs.length})` : ""}
        </span>
        <span style={{ fontSize: 12, color: "#ccc", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #f5f5f5", padding: "6px 12px 12px" }}>
          {!loaded && <p style={{ fontSize: 12, color: "#bbb", padding: "12px 6px", fontFamily: "system-ui" }}>Chargement…</p>}
          {loaded && logs.length === 0 && (
            <p style={{ fontSize: 12, color: "#bbb", padding: "12px 6px", fontFamily: "system-ui" }}>Aucune séance notée pour l'instant.</p>
          )}
          {logs.map(log => (
            <div key={log.id} style={{ padding: "12px 6px", borderBottom: "1px solid #f9f9f9" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: log.note_texte ? 6 : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#333", margin: "0 0 2px", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.seance_nom ?? "Séance"}
                  </p>
                  <p style={{ fontSize: 10, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>
                    {new Date(log.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {log.duration_min ? ` · ${log.duration_min} min` : ""}
                  </p>
                </div>
                {log.note_etoiles && (
                  <span style={{ fontSize: 12, flexShrink: 0, letterSpacing: 1 }}>
                    {"⭐".repeat(log.note_etoiles)}
                  </span>
                )}
              </div>
              {log.note_texte && (
                <p style={{ fontSize: 11, color: "#666", margin: 0, fontFamily: "system-ui", lineHeight: 1.5, fontStyle: "italic", paddingLeft: 2 }}>
                  "{log.note_texte}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Historique accordion ─────────────────────────────────────────────────────
const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours",  color: "#B22222" },
  pause:    { label: "En pause",  color: "#F59E0B" },
  termine:  { label: "Terminé",   color: "#10B981" },
};

function HistoriqueAccordion({ assignments, clienteId, onDeleted }: {
  assignments: Assignment[]; clienteId: string; onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (assignments.length === 0) return null;

  async function handleDelete(assignId: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" pour cette cliente ?`)) return;
    setDeleting(assignId);
    await fetch(`/api/coach/clientes/${clienteId}/programmes/${assignId}`, { method: "DELETE" });
    setDeleting(null);
    onDeleted();
  }

  return (
    <div style={{ marginTop: 8, borderRadius: 12, border: "1px solid #efefef", overflow: "hidden", backgroundColor: "#fff" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui" }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Historique programmes ({assignments.length})
        </span>
        <span style={{ fontSize: 12, color: "#ccc", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #f5f5f5", padding: "6px 12px 10px" }}>
          {assignments.map(a => {
            const st = STATUT_LABEL[a.statut] ?? STATUT_LABEL.termine;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: "1px solid #f9f9f9" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#333", margin: 0, fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.programme.nom}</p>
                  <p style={{ fontSize: 10, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>
                    Début {parseLocalDate(a.date_debut).toLocaleDateString("fr-FR")} · {a.programme.duree_semaines} sem.
                  </p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: st.color, padding: "2px 7px", borderRadius: 99, border: `1px solid ${st.color}22`, backgroundColor: `${st.color}11`, flexShrink: 0, fontFamily: "system-ui" }}>
                  {st.label}
                </span>
                <button
                  onClick={() => handleDelete(a.id, a.programme.nom)}
                  disabled={deleting === a.id}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444", fontSize: 11, cursor: "pointer", fontFamily: "system-ui", flexShrink: 0, opacity: deleting === a.id ? 0.5 : 1 }}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Panel liste des séances (édition mobile-friendly) ────────────────────────
function SeanceListPanel({ grid, dureeSemaines, onEditItem, onClose }: {
  grid: Grid; dureeSemaines: number;
  onEditItem: (cellKey: string, item: CellItem) => void;
  onClose: () => void;
}) {
  // Construire une liste triée semaine → jour → items
  const entries: { cellKey: string; semaine: number; jour: number; items: CellItem[] }[] = [];
  for (const [cellKey, items] of Object.entries(grid)) {
    const m = cellKey.match(/^S(\d+)_J(\d+)$/);
    if (!m || !items.length) continue;
    entries.push({ cellKey, semaine: parseInt(m[1]), jour: parseInt(m[2]), items });
  }
  entries.sort((a, b) => a.semaine !== b.semaine ? a.semaine - b.semaine : a.jour - b.jour);

  // Grouper par semaine
  const bySemaine: Record<number, typeof entries> = {};
  for (const e of entries) {
    (bySemaine[e.semaine] ??= []).push(e);
  }

  const totalSeances = entries.reduce((a, e) => a + e.items.length, 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(520px, 100vw)", backgroundColor: "#fff", display: "flex", flexDirection: "column", boxShadow: "-4px 0 32px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "#B22222", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui", fontWeight: 700 }}>
              Séances du programme
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
              {totalSeances} séance{totalSeances > 1 ? "s" : ""} sur {dureeSemaines} semaine{dureeSemaines > 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8, color: "#555", fontSize: 18, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕</button>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {totalSeances === 0 ? (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 40, fontFamily: "system-ui" }}>Aucune séance dans ce programme</p>
          ) : (
            Object.entries(bySemaine).map(([semStr, dayEntries]) => (
              <div key={semStr} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px", fontFamily: "system-ui" }}>
                  Semaine {semStr}
                </p>
                {dayEntries.map(({ cellKey, jour, items }) => (
                  <div key={cellKey} style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#888", margin: "0 0 4px", fontFamily: "system-ui" }}>
                      {JOURS_LONG[jour]}
                    </p>
                    {items.map(item => {
                      const label = item.type === "seance" ? item.seanceName : item.type === "seance_locale" ? item.nom : `🎬 ${item.titre}`;
                      const duree = item.type !== "video" ? item.duree : null;
                      return (
                        <button
                          key={item._key}
                          onClick={() => onEditItem(cellKey, item)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "13px 16px", borderRadius: 10, border: "1px solid #f0f0f0",
                            backgroundColor: "#fafafa", cursor: "pointer", textAlign: "left",
                            marginBottom: 6, fontFamily: "system-ui",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.type === "video" ? "#8B5CF6" : "#F97316", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            {duree && <span style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>{duree} min</span>}
                            <span style={{ fontSize: 13, color: "#ccc" }}>›</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal assignation ─────────────────────────────────────────────────────────
function AssignModal({ clienteId, onAssigned, onPersonnaliser, onClose }: {
  clienteId: string; onAssigned: () => void; onPersonnaliser: (assignId: string) => void; onClose: () => void;
}) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selected, setSelected] = useState("");
  const [dateDebut, setDateDebut] = useState(() => new Date().toISOString().split("T")[0]);
  const [joursSelectionnes, setJoursSelectionnes] = useState<number[]>([]);
  const [joursDansProg, setJoursDansProg] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    fetch("/api/coach/programmes").then(r => r.json()).then(d => setProgrammes(d.programmes ?? []));
  }, []);

  function handleSelectProg(id: string) {
    setSelected(id); setError("");
    const prog = programmes.find(p => p.id === id);
    if (!prog) return;
    const grid = decodeGrid(prog.description);
    const days = Array.from(new Set(Object.keys(grid).map(k => parseInt(k.match(/_J(\d+)$/)?.[1] ?? "0")).filter(j => j > 0))).sort((a,b) => a - b);
    setJoursDansProg(days);
    setJoursSelectionnes([...days]);
  }

  function toggleJour(j: number) {
    setJoursSelectionnes(prev => {
      if (prev.includes(j)) return prev.filter(x => x !== j);
      if (prev.length >= joursDansProg.length) return prev;
      return [...prev, j].sort((a, b) => a - b);
    });
  }

  async function handleSave() {
    if (!selected) { setError("Sélectionne un programme."); return; }
    if (joursSelectionnes.length !== joursDansProg.length) { setError(`Sélectionne exactement ${joursDansProg.length} jour${joursDansProg.length > 1 ? "s" : ""}.`); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/coach/clientes/${clienteId}/programmes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programme_id: selected, date_debut: dateDebut, jours_selectionnes: joursSelectionnes }),
    });
    if (res.ok) {
      const { assignment } = await res.json();
      onAssigned();
      setDone(assignment?.id ?? "");
      setSaving(false);
    } else { const d = await res.json(); setError(d.error ?? "Erreur"); setSaving(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", color: "#1a1a1a", backgroundColor: "#fff" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui" };
  const JOURS_LABELS = ["—","Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

  return (
    <div onClick={done ? undefined : onClose} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, backgroundColor: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>

        {/* ── Écran de succès ── */}
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 6px", color: "#1a1a1a", fontFamily: "system-ui" }}>Programme assigné !</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px", fontFamily: "system-ui" }}>
              Tu peux maintenant personnaliser les séances pour l'adapter à cette cliente.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => { onPersonnaliser(done); onClose(); }}
                style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                ✏️ Personnaliser les séances
              </button>
              <button
                onClick={onClose}
                style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px solid #eee", background: "#fafafa", fontSize: 13, color: "#555", cursor: "pointer", fontFamily: "system-ui" }}>
                Plus tard
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 20px", color: "#1a1a1a", fontFamily: "system-ui" }}>📅 Assigner un programme</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Programme</label>
                <select style={{ ...inp, cursor: "pointer" }} value={selected} onChange={e => handleSelectProg(e.target.value)}>
                  <option value="">— Choisir un programme —</option>
                  {programmes.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.duree_semaines} sem.)</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Date de début</label>
                <input type="date" style={inp} value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
              </div>
              {selected && joursDansProg.length > 0 && (
                <div>
                  <label style={lbl}>Jours d'entraînement <span style={{ color: "#B22222", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {joursDansProg.length} jour{joursDansProg.length > 1 ? "s" : ""}</span></label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1,2,3,4,5,6,7].map(j => {
                      const isOn = joursSelectionnes.includes(j);
                      return <button key={j} onClick={() => toggleJour(j)} style={{ padding: "7px 11px", borderRadius: 8, border: isOn ? "2px solid #B22222" : "1px solid #ddd", backgroundColor: isOn ? "rgba(178,34,34,0.06)" : "#fafafa", color: isOn ? "#B22222" : "#555", fontSize: 12, fontWeight: isOn ? 700 : 400, cursor: "pointer", fontFamily: "system-ui" }}>{JOURS_LABELS[j]}</button>;
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: "#aaa", margin: "6px 0 0", fontFamily: "system-ui" }}>{joursSelectionnes.length}/{joursDansProg.length} sélectionné{joursSelectionnes.length > 1 ? "s" : ""}</p>
                </div>
              )}
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #eee", background: "#fafafa", fontSize: 13, color: "#555", cursor: "pointer", fontFamily: "system-ui" }}>Annuler</button>
                <button onClick={handleSave} disabled={saving || !selected} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", backgroundColor: saving || !selected ? "#eee" : "#B22222", color: saving || !selected ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving || !selected ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
                  {saving ? "Assignation…" : "✅ Assigner"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal édition / suppression événement ────────────────────────────────────
function EventEditModal({ ev, clienteId, onClose, onUpdated }: {
  ev: CalendarEvent; clienteId: string; onClose: () => void; onUpdated: () => void;
}) {
  const [titre, setTitre] = useState(ev.titre);
  const [date, setDate] = useState(ev.date);
  const [heure, setHeure] = useState(ev.heure ?? "");
  const [message, setMessage] = useState(ev.message ?? "");
  const [lien, setLien] = useState(ev.lien ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isTache = ev.event_type === "tache";

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui" };

  async function handleSave() {
    if (!titre) { setError("Titre requis"); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/coach/clientes/${clienteId}/evenements?event_id=${ev.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, date, heure: heure || null, message: message || null, lien: lien || null }),
    });
    if (res.ok) { onUpdated(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${ev.titre}" ?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/coach/clientes/${clienteId}/evenements?event_id=${ev.id}`, { method: "DELETE" });
    if (res.ok) { onUpdated(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); setDeleting(false); }
  }

  const typeColor = EV_COLORS[ev.event_type ?? ""] ?? "#B22222";
  const typeLabel = EV_LABELS[ev.event_type ?? ""] ?? "Événement";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 350, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, backgroundColor: "#111", borderRadius: 16, padding: "24px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: typeColor, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px", fontFamily: "system-ui" }}>{typeLabel}</p>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#F5F5F0", fontFamily: "system-ui" }}>Modifier l'événement</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, color: "#666", fontSize: 18, cursor: "pointer", padding: "5px 11px", fontFamily: "system-ui" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={lbl}>Titre *</label>
            <input style={inp} value={titre} onChange={e => setTitre(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isTache ? "1fr" : "1fr 1fr", gap: 8 }}>
            <div><label style={lbl}>Date *</label>
              <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            {!isTache && (
              <div><label style={lbl}>Heure</label>
                <input type="time" style={inp} value={heure} onChange={e => setHeure(e.target.value)} />
              </div>
            )}
          </div>
          <div><label style={lbl}>{isTache ? "Description" : "Message"}</label>
            <textarea style={{ ...inp, minHeight: 72, resize: "none" }} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {!isTache && (
            <div><label style={lbl}>Lien (zoom, etc.)</label>
              <input type="url" style={inp} value={lien} onChange={e => setLien(e.target.value)} placeholder="https://…" />
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>✗ {error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: 12, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "system-ui", opacity: deleting ? 0.5 : 1 }}>
            {deleting ? "…" : "🗑 Supprimer"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#161616", fontSize: 13, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", backgroundColor: saving ? "#2a2a2a" : "#B22222", color: saving ? "#555" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
            {saving ? "Enregistrement…" : "✅ Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function ClienteFichePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gridData, setGridData] = useState<Grid>({});
  const [editTarget, setEditTarget] = useState<{ cellKey: string; item: CellItem } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [today] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [showAddEv, setShowAddEv] = useState(false);
  const [addEvDate, setAddEvDate] = useState(toLocalDate(new Date()));
  const [showSeanceList, setShowSeanceList] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const loadCalEvents = useCallback(() => {
    fetch(`/api/coach/clientes/${id}/evenements`).then(r => r.json()).then(d => setCalEvents(d.events ?? []));
  }, [id]);

  function goToEditor(assignId: string) {
    router.push(`/coach/clientes/${id}/programmes/${assignId}`);
  }

  const loadAssignments = useCallback(async () => {
    const res = await fetch(`/api/coach/clientes/${id}/programmes`);
    const d = await res.json();
    const list: Assignment[] = d.assignments ?? [];
    setAssignments(list);
    const active = list.find(a => a.statut === "en_cours");
    if (active) {
      const src = active.grid_data?.startsWith("{") ? active.grid_data : active.programme?.description;
      setGridData(decodeGrid(src ?? null));
    }
  }, [id]);

  useEffect(() => {
    fetch("/api/coach/clientes").then(r => r.json()).then(d => setCliente((d.clientes ?? []).find((c: Cliente) => c.id === id) ?? null));
    loadAssignments();
    loadCalEvents();
  }, [id, loadAssignments, loadCalEvents]);

  const enCours = assignments.find(a => a.statut === "en_cours") ?? null;
  const termines = assignments.filter(a => a.statut === "termine");
  const activeStart = enCours ? parseLocalDate(enCours.date_debut) : null;
  const dureeSemaines = enCours?.programme?.duree_semaines ?? 0;
  const totalSeancesPrevues = Object.values(gridData).reduce((a, items) => a + items.length, 0);

  async function patchGrid(newGrid: Grid) {
    if (!enCours) return;
    const src = enCours.grid_data?.startsWith("{") ? enCours.grid_data : enCours.programme?.description ?? "{}";
    const parsed = JSON.parse(src);
    const newGridData = JSON.stringify({ ...parsed, grid: newGrid });
    await fetch(`/api/coach/clientes/${id}/programmes/${enCours.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grid_data: newGridData }),
    });
    setGridData(newGrid);
  }

  function handleMoveItem(fromKey: string, itemKey: string, toKey: string) {
    const item = (gridData[fromKey] ?? []).find(i => i._key === itemKey);
    if (!item) return;
    const newGrid = { ...gridData };
    newGrid[fromKey] = (newGrid[fromKey] ?? []).filter(i => i._key !== itemKey);
    if (!newGrid[fromKey].length) delete newGrid[fromKey];
    newGrid[toKey] = [...(newGrid[toKey] ?? []), { ...item, _key: nk() }];
    patchGrid(newGrid);
  }

  function handleEditSave(updatedItem: CellItem, newCellKey: string, applyToAll: boolean) {
    if (!editTarget) return;
    const { cellKey: oldKey } = editTarget;
    const newGrid = { ...gridData };

    if (applyToAll) {
      const name = getItemName(editTarget.item);
      const oldJour = parseInt(oldKey.match(/_J(\d+)$/)?.[1] ?? "0");
      const newJour = parseInt(newCellKey.match(/_J(\d+)$/)?.[1] ?? "0");
      const dayChanged = oldJour !== newJour;

      for (const key of Object.keys(newGrid)) {
        const items = newGrid[key] ?? [];
        const matching = items.filter(i => getItemName(i) === name);
        if (!matching.length) continue;

        newGrid[key] = items.filter(i => getItemName(i) !== name);
        if (!newGrid[key].length) delete newGrid[key];

        const semStr = key.match(/^S(\d+)_/)?.[1] ?? "1";
        const destJour = dayChanged ? newJour : parseInt(key.match(/_J(\d+)$/)?.[1] ?? String(newJour));
        const destKey = `S${semStr}_J${destJour}`;
        newGrid[destKey] = [
          ...(newGrid[destKey] ?? []),
          ...matching.map(i => ({ ...i, ...updatedItem, _key: nk() })),
        ];
      }
    } else {
      newGrid[oldKey] = (newGrid[oldKey] ?? []).filter(i => i._key !== updatedItem._key);
      if (!newGrid[oldKey].length) delete newGrid[oldKey];
      newGrid[newCellKey] = [...(newGrid[newCellKey] ?? []), updatedItem];
    }

    patchGrid(newGrid);
    setEditTarget(null);
  }

  function handleDeleteItem() {
    if (!editTarget) return;
    const { cellKey, item } = editTarget;
    const newGrid = { ...gridData };
    newGrid[cellKey] = (newGrid[cellKey] ?? []).filter(i => i._key !== item._key);
    if (!newGrid[cellKey].length) delete newGrid[cellKey];
    patchGrid(newGrid);
    setEditTarget(null);
  }

  async function handleTerminer(assignId: string) {
    if (!confirm("Marquer ce programme comme terminé ?")) return;
    await fetch(`/api/coach/clientes/${id}/programmes/${assignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "termine" }) });
    loadAssignments();
  }

  async function handleSeanceFaite(assignId: string, current: number) {
    await fetch(`/api/coach/clientes/${id}/programmes/${assignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seances_effectuees: current + 1 }) });
    loadAssignments();
  }

  async function handlePreview() {
    await fetch(`/api/coach/clientes/${id}/preview`, { method: "POST" });
    let target = "/dashboard";
    try {
      const res = await fetch("/api/admin/offres");
      if (res.ok) {
        const data = await res.json();
        const entry = data.clients?.find((c: { id: string; offre: string | null }) => c.id === id);
        if (entry?.offre === "TTS") target = "/tts";
      }
    } catch {}
    window.open(target, "_blank");
  }

  function displayName(c: Cliente) {
    if (c.prenom || c.nom) return [c.prenom, c.nom].filter(Boolean).join(" ");
    return c.email;
  }

  const lbl10: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui" };

  return (
    <div>
      {/* Header */}
      <div className="coach-cliente-header">
        <button onClick={() => router.push("/coach/clientes")} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}>← Retour</button>
        {cliente && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#B22222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "system-ui" }}>{((cliente.prenom?.[0] ?? "") + (cliente.nom?.[0] ?? "")).toUpperCase() || cliente.email[0].toUpperCase()}</span>
            </div>
            <div>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>{displayName(cliente)}</h1>
              <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>{cliente.email}</p>
            </div>
          </div>
        )}
        <div className="coach-cliente-actions">
          {cliente?.date_demarrage && (
            <div style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", textAlign: "center" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Démarrage</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
                {new Date(cliente.date_demarrage).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          )}
          <button onClick={handlePreview} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #7C3AED", backgroundColor: "#fff", color: "#7C3AED", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
            👁 Voir comme cliente
          </button>
          <button onClick={() => setShowModal(true)} style={{ padding: "9px 16px", borderRadius: 8, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", boxShadow: "0 2px 6px rgba(178,34,34,0.25)" }}>
            📅 Assigner un programme
          </button>
        </div>
      </div>

      {/* Calendrier */}
      <MonthCalendar
        grid={gridData} activeStart={activeStart} dureeSemaines={dureeSemaines} today={today}
        events={calEvents}
        onEditItem={(cellKey, item) => setEditTarget({ cellKey, item })}
        onMoveItem={handleMoveItem}
        onAddEvent={(date) => { setAddEvDate(toLocalDate(date)); setShowAddEv(true); }}
        onEventClick={(ev) => setEditEvent(ev)}
      />

      {/* Programme en cours */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "18px", marginBottom: 12 }}>
        <p style={{ ...lbl10, marginBottom: 12 }}>Programme en cours</p>
        {!enCours ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Aucun programme assigné</p>
            <button onClick={() => setShowModal(true)} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>+ Assigner un programme</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui" }}>{enCours.programme.nom}</p>
              <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 10px", fontFamily: "system-ui" }}>{NIV[enCours.programme.niveau] ?? enCours.programme.niveau} · {enCours.programme.duree_semaines} semaines · début le {new Date(enCours.date_debut).toLocaleDateString("fr-FR")}</p>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#888", fontFamily: "system-ui" }}>Séances effectuées</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1a1a", fontFamily: "system-ui" }}>{enCours.seances_effectuees} / {totalSeancesPrevues}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, backgroundColor: "#f0f0f0", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, backgroundColor: "#B22222", width: totalSeancesPrevues > 0 ? `${Math.min(100, (enCours.seances_effectuees / totalSeancesPrevues) * 100)}%` : "0%" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              <button onClick={() => enCours && goToEditor(enCours.id)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>✏️ Modifier les séances</button>
              <button onClick={() => handleSeanceFaite(enCours.id, enCours.seances_effectuees)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", backgroundColor: "#10B981", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>✓ Séance faite</button>
              <button onClick={() => handleTerminer(enCours.id)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e0e0e0", background: "#fafafa", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>Marquer terminé</button>
            </div>
          </div>
        )}
      </div>

      {/* Historique / gestion des programmes assignés */}
      <HistoriqueAccordion assignments={assignments} clienteId={id} onDeleted={loadAssignments} />

      {/* Journal des séances (notes post-séance) */}
      <JournalSeances clienteId={id} />

      {/* Edit panel */}
      {editTarget && enCours && (
        <SeanceEditPanel
          item={editTarget.item}
          cellKey={editTarget.cellKey}
          dureeSemaines={dureeSemaines}
          otherInstancesCount={Object.entries(gridData)
            .filter(([k]) => k !== editTarget.cellKey)
            .reduce((acc, [, items]) => acc + items.filter(i => getItemName(i) === getItemName(editTarget.item)).length, 0)}
          onSave={handleEditSave}
          onDelete={handleDeleteItem}
          onClose={() => setEditTarget(null)}
        />
      )}

      {showModal && <AssignModal clienteId={id} onAssigned={loadAssignments} onPersonnaliser={goToEditor} onClose={() => setShowModal(false)} />}

      {showSeanceList && enCours && (
        <SeanceListPanel
          grid={gridData}
          dureeSemaines={dureeSemaines}
          onEditItem={(cellKey, item) => { setEditTarget({ cellKey, item }); setShowSeanceList(false); }}
          onClose={() => setShowSeanceList(false)}
        />
      )}

      {showAddEv && (
        <AddEvenementModal
          clienteId={id}
          defaultDate={addEvDate}
          onAdded={(ev) => setCalEvents(prev => [...prev, ev])}
          onClose={() => setShowAddEv(false)}
        />
      )}

      {editEvent && (
        <EventEditModal
          ev={editEvent}
          clienteId={id}
          onClose={() => setEditEvent(null)}
          onUpdated={() => { setEditEvent(null); loadCalEvents(); }}
        />
      )}
    </div>
  );
}
