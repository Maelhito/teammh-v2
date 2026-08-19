"use client";

import { useEffect, useState } from "react";
import { CHAMPS, ecarts, formatEcart, trierParDate, type Mesure, type PhotoProgression } from "@/lib/mesures";
import MesureChart from "@/app/mesures/MesureChart";
import PhotosCliente from "./PhotosCliente";

function labelDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Vert si la mesure baisse, ambre si elle monte (thème clair du portail coach) */
function couleur(v: number | null): string {
  if (v === null || v === 0) return "#888";
  return v < 0 ? "#10B981" : "#F59E0B";
}





/** Formulaire de saisie : une date + une valeur texte par champ */
type Saisie = Record<string, string>;

function saisieVide(): Saisie {
  return { date: new Date().toISOString().slice(0, 10), note: "" };
}

function saisieDepuis(m: Mesure): Saisie {
  const s: Saisie = { date: m.date, note: m.note ?? "" };
  for (const { champ } of CHAMPS) s[champ] = m[champ] != null ? String(m[champ]) : "";
  return s;
}

export default function MesuresCliente({ clienteId }: { clienteId: string }) {
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [photos, setPhotos] = useState<PhotoProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function charger() {
    try {
      const res = await fetch(`/api/coach/clientes/${clienteId}/mesures`);
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMesures(d.mesures ?? []); setPhotos(d.photos ?? []); setError(null); }
      else setError(d.error ?? "Erreur de chargement");
    } catch {
      setError("Impossible de charger les mesures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/coach/clientes/${clienteId}/mesures`);
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) { setMesures(d.mesures ?? []); setPhotos(d.photos ?? []); }
        else setError(d.error ?? "Erreur de chargement");
      } catch {
        if (!cancelled) setError("Impossible de charger les mesures");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clienteId]);

  async function enregistrer() {
    if (!saisie) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clienteId}/mesures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saisie),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "ok", text: `✓ Mesures du ${labelDate(saisie.date)} enregistrées.` });
        setSaisie(null);
        setShowAll(true);
        await charger();
      } else {
        setMsg({ type: "err", text: d.error ?? "Enregistrement impossible." });
      }
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : rien n'a été enregistré." });
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(m: Mesure) {
    if (!confirm(`Supprimer les mesures du ${labelDate(m.date)} ?`)) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clienteId}/mesures?mesureId=${m.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { await charger(); setMsg({ type: "ok", text: "✓ Ligne supprimée." }); }
      else setMsg({ type: "err", text: d.error ?? "Suppression impossible." });
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : rien n'a été supprimé." });
    }
  }

  const card: React.CSSProperties = {
    backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef",
    padding: "16px 18px", marginBottom: 12,
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em",
    textTransform: "uppercase", margin: 0, fontFamily: "system-ui",
  };

  if (loading) {
    return <div style={card}><p style={lbl}>Suivi des mesures</p><p style={{ fontSize: 12, color: "#bbb", margin: "8px 0 0", fontFamily: "system-ui" }}>Chargement…</p></div>;
  }
  if (error) {
    return <div style={card}><p style={lbl}>Suivi des mesures</p><p style={{ fontSize: 12, color: "#F87171", margin: "8px 0 0", fontFamily: "system-ui" }}>⚠ {error}</p></div>;
  }
  const historique = trierParDate(mesures).slice().reverse();
  const derniere = historique[0];

  const champInput: React.CSSProperties = {
    width: 96, backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 8,
    padding: "7px 9px", color: "#1a1a1a", fontSize: 12, outline: "none",
    textAlign: "right", fontFamily: "system-ui",
  };

  /** Saisie libre : n'importe quelle date, n'importe quels champs */
  const editeur = saisie && (
    <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui" }}>
        Saisie des mesures
      </p>
      <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 12px", fontFamily: "system-ui" }}>
        Aucun champ obligatoire. Une date déjà enregistrée est remplacée.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <label style={{ flex: 1, fontSize: 12, color: "#888", fontFamily: "system-ui" }}>Date</label>
        <input
          type="date"
          value={saisie.date}
          onChange={(e) => { setSaisie((s) => ({ ...s!, date: e.target.value })); setMsg(null); }}
          style={{ ...champInput, width: 148, textAlign: "left" }}
        />
        <span style={{ width: 22 }} />
      </div>

      {CHAMPS.map(({ champ, label, unite, placeholder }) => (
        <div key={champ} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <label style={{ flex: 1, fontSize: 12, color: "#888", fontFamily: "system-ui" }}>{label}</label>
          <input
            type="text"
            inputMode="decimal"
            value={saisie[champ] ?? ""}
            onChange={(e) => { setSaisie((s) => ({ ...s!, [champ]: e.target.value })); setMsg(null); }}
            placeholder={placeholder}
            style={champInput}
          />
          <span style={{ width: 22, fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>{unite}</span>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <label style={{ flex: 1, fontSize: 12, color: "#888", fontFamily: "system-ui" }}>Note</label>
        <input
          type="text"
          value={saisie.note ?? ""}
          onChange={(e) => { setSaisie((s) => ({ ...s!, note: e.target.value })); setMsg(null); }}
          placeholder="Reprise ancienne appli…"
          style={{ ...champInput, width: 200, textAlign: "left" }}
        />
        <span style={{ width: 22 }} />
      </div>

      {msg && (
        <p style={{ fontSize: 11, margin: "12px 0 0", fontFamily: "system-ui", color: msg.type === "ok" ? "#10B981" : "#F87171" }}>
          {msg.text}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          onClick={() => { setSaisie(null); setMsg(null); }}
          style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #e8e8e8", backgroundColor: "#fff", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}
        >
          Annuler
        </button>
        <button
          onClick={enregistrer}
          disabled={saving}
          style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", backgroundColor: saving ? "#ccc" : "#B45309", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );

  const boutonAjouter = !saisie && (
    <button
      onClick={() => { setSaisie(saisieVide()); setMsg(null); }}
      style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid #B45309", backgroundColor: "#fff", color: "#B45309", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}
    >
      + Ajouter une mesure
    </button>
  );

  if (!mesures.length && !photos.length) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <p style={lbl}>Suivi des mesures</p>
          {boutonAjouter}
        </div>
        {editeur}
        {!saisie && (
          <p style={{ fontSize: 12, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>
            Aucune mesure enregistrée pour l&apos;instant.
          </p>
        )}
        {!saisie && msg && (
          <p style={{ fontSize: 11, marginTop: 8, fontFamily: "system-ui", color: msg.type === "ok" ? "#10B981" : "#F87171" }}>{msg.text}</p>
        )}
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <p style={lbl}>
          Suivi des mesures
          {derniere && <span style={{ marginLeft: 8, color: "#888", letterSpacing: 0, fontWeight: 400 }}>dernière le {labelDate(derniere.date)}</span>}
        </p>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {boutonAjouter}
          {(historique.length > 0 || photos.length > 0) && (
            <button
              onClick={() => setShowAll((s) => !s)}
              style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", color: "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}
            >
              {showAll ? "Réduire le détail ▲" : "Voir le détail ▼"}
            </button>
          )}
        </div>
      </div>

      {editeur}
      {!saisie && msg && (
        <p style={{ fontSize: 11, margin: "0 0 12px", fontFamily: "system-ui", color: msg.type === "ok" ? "#10B981" : "#F87171" }}>
          {msg.text}
        </p>
      )}

      {/* Indicateurs clés */}
      {mesures.length > 0 && (
        <div className="coach-cliente-2col">
          {CHAMPS.filter((c) => c.cle).map(({ champ, label, unite }) => {
            const e = ecarts(mesures, champ);
            return (
              <div key={champ} style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "system-ui" }}>
                  {label}
                </p>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
                  {e.actuel ?? "—"}
                  {e.actuel != null && <span style={{ fontSize: 12, color: "#aaa", marginLeft: 3 }}>{unite}</span>}
                </p>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, color: couleur(e.vsPrecedent), fontFamily: "system-ui" }}>
                    {formatEcart(e.vsPrecedent, unite)} <span style={{ color: "#bbb" }}>vs précédent</span>
                  </span>
                  <span style={{ fontSize: 11, color: couleur(e.vsDepart), fontFamily: "system-ui" }}>
                    {formatEcart(e.vsDepart, unite)} <span style={{ color: "#bbb" }}>depuis le départ</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Courbes — visibles d'emblée : c'est ce qui se lit le plus vite */}
      {mesures.length >= 2 && (
        <div className="coach-cliente-2col" style={{ marginTop: 14 }}>
          {CHAMPS.filter((c) => c.cle).map(({ champ, label, unite }) => (
            <div key={champ} style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px", fontFamily: "system-ui" }}>
                Évolution · {label}
              </p>
              <MesureChart mesures={mesures} champ={champ} unite={unite} clair />
            </div>
          ))}
        </div>
      )}

      {showAll && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f5f5f5" }}>
          {/* Historique complet */}
          {historique.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px", fontFamily: "system-ui" }}>
                Historique
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: photos.length ? 16 : 0 }}>
                {historique.map((m) => (
                  <div key={m.id} style={{ borderBottom: "1px solid #f5f5f5", paddingBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 3px" }}>
                      <p style={{ fontSize: 11, color: "#888", margin: 0, fontWeight: 700, fontFamily: "system-ui", flex: 1 }}>{labelDate(m.date)}</p>
                      <button
                        onClick={() => { setSaisie(saisieDepuis(m)); setMsg(null); }}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", color: "#888", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => supprimer(m)}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #fbdcdc", backgroundColor: "#fff", color: "#D9534F", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}
                      >
                        Supprimer
                      </button>
                    </div>
                    {m.note && (
                      <p style={{ fontSize: 11, color: "#bbb", margin: "0 0 3px", fontFamily: "system-ui", fontStyle: "italic" }}>{m.note}</p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px" }}>
                      {CHAMPS.filter(({ champ }) => m[champ] != null).map(({ champ, label, unite }) => (
                        <span key={champ} style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>
                          {label} <span style={{ color: "#1a1a1a", fontWeight: 700 }}>{String(m[champ])}</span> {unite}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Photos : comparateur avant/après + galerie complète groupée par date */}
          {photos.length > 0 && <PhotosCliente photos={photos} />}
        </div>
      )}
    </div>
  );
}
