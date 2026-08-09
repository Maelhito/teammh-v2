"use client";

import { useEffect, useRef, useState } from "react";
import { ANGLES, type Angle, type PhotoProgression } from "@/lib/mesures";

function labelDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function PhotosSection() {
  const [photos, setPhotos] = useState<PhotoProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState<Angle | null>(null);
  const [angleCompare, setAngleCompare] = useState<Angle>("face");
  const [avantId, setAvantId] = useState<string>("");
  const [apresId, setApresId] = useState<string>("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function charger() {
    try {
      const res = await fetch("/api/mesures/photos");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setPhotos(d.photos ?? []);
      else setMsg({ type: "err", text: d.error ?? "Impossible de charger tes photos." });
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : photos non chargées." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function handleUpload(angle: Angle, file: File) {
    setUploading(angle);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("angle", angle);
      const res = await fetch("/api/mesures/photos", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "ok", text: "✓ Photo ajoutée." });
        await charger();
      } else {
        setMsg({ type: "err", text: d.error ?? "La photo n'a pas été enregistrée." });
      }
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : la photo n'a pas été enregistrée, réessaie." });
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    try {
      const res = await fetch(`/api/mesures/photos?id=${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) await charger();
      else setMsg({ type: "err", text: d.error ?? "Suppression impossible." });
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : suppression impossible." });
    }
  }

  const pourAngle = photos.filter((p) => p.angle === angleCompare);
  const avant = pourAngle.find((p) => p.id === avantId) ?? pourAngle[0];
  const apres = pourAngle.find((p) => p.id === apresId) ?? pourAngle[pourAngle.length - 1];
  const comparaisonPossible = pourAngle.length >= 2 && avant && apres && avant.id !== apres.id;

  const carte: React.CSSProperties = {
    backgroundColor: "#111111",
    border: "1px solid #1a1a1a",
    borderRadius: 16,
    padding: "16px 18px",
  };
  const selectStyle: React.CSSProperties = {
    backgroundColor: "#0D0D0D",
    border: "1px solid #262626",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#F5F5F0",
    fontSize: "0.78rem",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ajout */}
      <div style={carte}>
        <p className="font-body" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 4px" }}>
          Ajouter des photos
        </p>
        <p className="font-body" style={{ fontSize: "0.72rem", color: "#6B7280", margin: "0 0 12px", lineHeight: 1.45 }}>
          Quand tu veux, dans les mêmes conditions (même lumière, même tenue). Tes photos sont privées :
          seules toi et ton coach pouvez les voir.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {ANGLES.map(({ angle, label }) => (
            <div key={angle}>
              <input
                ref={(el) => { inputs.current[angle] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(angle, f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => inputs.current[angle]?.click()}
                disabled={uploading !== null}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px dashed #333",
                  backgroundColor: "#0D0D0D",
                  color: uploading === angle ? "#F59E0B" : "#9CA3AF",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {uploading === angle ? "…" : `+ ${label}`}
              </button>
            </div>
          ))}
        </div>

        {msg && (
          <p style={{ fontSize: "0.75rem", margin: "10px 0 0", color: msg.type === "ok" ? "#4ADE80" : "#F87171" }}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Comparateur avant / après */}
      {photos.length > 0 && (
        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <p className="font-body" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>
              Avant / après
            </p>
            <select value={angleCompare} onChange={(e) => { setAngleCompare(e.target.value as Angle); setAvantId(""); setApresId(""); }} style={selectStyle}>
              {ANGLES.map(({ angle, label }) => (
                <option key={angle} value={angle} style={{ backgroundColor: "#1A1A1A" }}>{label}</option>
              ))}
            </select>
          </div>

          {!comparaisonPossible ? (
            <p style={{ fontSize: "0.76rem", color: "#6B7280", margin: 0, textAlign: "center", padding: "16px 0" }}>
              Il faut au moins 2 photos « {ANGLES.find((a) => a.angle === angleCompare)?.label} » prises à des dates différentes.
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[{ p: avant, titre: "Avant", set: setAvantId, val: avant.id },
                  { p: apres, titre: "Après", set: setApresId, val: apres.id }].map(({ p, titre, set, val }) => (
                  <div key={titre}>
                    <p style={{ fontSize: "0.68rem", color: "#6B7280", margin: "0 0 6px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {titre}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={`${titre} — ${labelDate(p.date)}`}
                      style={{ width: "100%", borderRadius: 10, display: "block", backgroundColor: "#0D0D0D" }}
                    />
                    <select value={val} onChange={(e) => set(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 6, fontSize: "0.7rem" }}>
                      {pourAngle.map((ph) => (
                        <option key={ph.id} value={ph.id} style={{ backgroundColor: "#1A1A1A" }}>{labelDate(ph.date)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Galerie */}
      {loading ? (
        <div style={{ ...carte, textAlign: "center", color: "#6B7280", fontSize: "0.8rem" }}>Chargement…</div>
      ) : photos.length === 0 ? (
        <div style={{ ...carte, textAlign: "center", color: "#6B7280", fontSize: "0.8rem" }}>
          Aucune photo pour l&apos;instant.
        </div>
      ) : (
        <div style={carte}>
          <p className="font-body" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 12px" }}>
            Toutes mes photos <span style={{ color: "#6B7280", fontWeight: 400 }}>({photos.length})</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[...photos].reverse().map((p) => (
              <div key={p.id} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${p.angle} ${labelDate(p.date)}`}
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8, display: "block", backgroundColor: "#0D0D0D" }} />
                <p style={{ fontSize: "0.62rem", color: "#6B7280", margin: "4px 0 0", textAlign: "center" }}>
                  {ANGLES.find((a) => a.angle === p.angle)?.label} · {labelDate(p.date)}
                </p>
                <button
                  onClick={() => handleDelete(p.id)}
                  aria-label="Supprimer la photo"
                  style={{
                    position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%",
                    border: "none", backgroundColor: "rgba(0,0,0,0.65)", color: "#F87171",
                    fontSize: 12, cursor: "pointer", lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
