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





export default function MesuresCliente({ clienteId }: { clienteId: string }) {
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [photos, setPhotos] = useState<PhotoProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
  if (!mesures.length && !photos.length) {
    return <div style={card}><p style={lbl}>Suivi des mesures</p><p style={{ fontSize: 12, color: "#bbb", margin: "8px 0 0", fontFamily: "system-ui" }}>Aucune mesure enregistrée pour l&apos;instant.</p></div>;
  }

  const historique = trierParDate(mesures).slice().reverse();
  const derniere = historique[0];

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <p style={lbl}>
          Suivi des mesures
          {derniere && <span style={{ marginLeft: 8, color: "#888", letterSpacing: 0, fontWeight: 400 }}>dernière le {labelDate(derniere.date)}</span>}
        </p>
        {(historique.length > 0 || photos.length > 0) && (
          <button
            onClick={() => setShowAll((s) => !s)}
            style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", color: "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}
          >
            {showAll ? "Réduire le détail ▲" : "Voir le détail ▼"}
          </button>
        )}
      </div>

      {/* Indicateurs clés */}
      {mesures.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
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
                    <p style={{ fontSize: 11, color: "#888", margin: "0 0 3px", fontWeight: 700, fontFamily: "system-ui" }}>{labelDate(m.date)}</p>
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
