"use client";

import { useState } from "react";
import { ANGLES, type Angle, type PhotoProgression } from "@/lib/mesures";

function labelDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const selectStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: 8,
  padding: "6px 9px",
  color: "#1a1a1a",
  fontSize: 11,
  fontFamily: "system-ui",
  outline: "none",
};

/**
 * Vue coach des photos de progression d'une cliente — lecture seule.
 * Comparateur avant/après par angle, galerie complète groupée par date,
 * et agrandissement au clic (lightbox).
 */
export default function PhotosCliente({ photos }: { photos: PhotoProgression[] }) {
  const [angleCompare, setAngleCompare] = useState<Angle>("face");
  const [avantId, setAvantId] = useState<string>("");
  const [apresId, setApresId] = useState<string>("");
  const [zoom, setZoom] = useState<PhotoProgression | null>(null);

  const pourAngle = photos.filter((p) => p.angle === angleCompare);
  const avant = pourAngle.find((p) => p.id === avantId) ?? pourAngle[0];
  const apres = pourAngle.find((p) => p.id === apresId) ?? pourAngle[pourAngle.length - 1];
  const comparaisonPossible = pourAngle.length >= 2 && avant && apres && avant.id !== apres.id;

  // Groupées par date, plus récent en premier
  const parDate = new Map<string, PhotoProgression[]>();
  for (const p of [...photos].sort((a, b) => b.date.localeCompare(a.date))) {
    const liste = parDate.get(p.date) ?? [];
    liste.push(p);
    parDate.set(p.date, liste);
  }

  if (photos.length === 0) {
    return <p style={{ fontSize: 12, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>Aucune photo pour l&apos;instant.</p>;
  }

  return (
    <div>
      {/* Comparateur avant / après */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0, fontFamily: "system-ui" }}>
            Avant / après
          </p>
          <select
            value={angleCompare}
            onChange={(e) => { setAngleCompare(e.target.value as Angle); setAvantId(""); setApresId(""); }}
            style={selectStyle}
          >
            {ANGLES.map(({ angle, label }) => (
              <option key={angle} value={angle}>{label}</option>
            ))}
          </select>
        </div>

        {!comparaisonPossible ? (
          <p style={{ fontSize: 11, color: "#bbb", margin: 0, textAlign: "center", padding: "14px 0", fontFamily: "system-ui" }}>
            Il faut au moins 2 photos « {ANGLES.find((a) => a.angle === angleCompare)?.label} » prises à des dates différentes.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ p: avant, titre: "Avant", set: setAvantId, val: avant.id },
              { p: apres, titre: "Après", set: setApresId, val: apres.id }].map(({ p, titre, set, val }) => (
              <div key={titre}>
                <p style={{ fontSize: 9, color: "#aaa", margin: "0 0 5px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "system-ui" }}>
                  {titre}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`${titre} — ${labelDate(p.date)}`}
                  onClick={() => setZoom(p)}
                  style={{ width: "100%", borderRadius: 8, display: "block", backgroundColor: "#fafafa", border: "1px solid #efefef", cursor: "zoom-in" }}
                />
                <select value={val} onChange={(e) => set(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 5, fontSize: 10 }}>
                  {pourAngle.map((ph) => (
                    <option key={ph.id} value={ph.id}>{labelDate(ph.date)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Galerie complète, groupée par date */}
      <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
        Toutes les photos <span style={{ color: "#bbb", fontWeight: 400 }}>({photos.length})</span>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...parDate.entries()].map(([date, liste]) => (
          <div key={date}>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 6px", fontWeight: 700, fontFamily: "system-ui" }}>{labelDate(date)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
              {liste.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt={`${p.angle} ${labelDate(p.date)}`}
                  onClick={() => setZoom(p)}
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8, display: "block", backgroundColor: "#fafafa", border: "1px solid #efefef", cursor: "zoom-in" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1000,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 24, cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.url}
            alt={`${zoom.angle} ${labelDate(zoom.date)}`}
            style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 10, objectFit: "contain" }}
          />
          <p style={{ color: "#fff", fontSize: 13, marginTop: 12, fontFamily: "system-ui" }}>
            {ANGLES.find((a) => a.angle === zoom.angle)?.label} · {labelDate(zoom.date)}
          </p>
          <button
            onClick={() => setZoom(null)}
            aria-label="Fermer"
            style={{
              position: "absolute", top: 20, right: 24, width: 36, height: 36, borderRadius: "50%",
              border: "none", backgroundColor: "rgba(255,255,255,0.15)", color: "#fff",
              fontSize: 18, cursor: "pointer", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
