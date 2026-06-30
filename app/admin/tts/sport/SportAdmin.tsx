"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader } from "../TtsShared";

interface Video {
  id: string;
  titre: string;
  lien_youtube: string;
  ordre: number;
}

interface Programme {
  id: string;
  numero_mois: number;
  titre: string | null;
  videos: Video[];
}

export default function SportAdmin() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [numeroMois, setNumeroMois] = useState("");
  const [titreProgramme, setTitreProgramme] = useState("");
  const [savingProgramme, setSavingProgramme] = useState(false);

  const [videoForms, setVideoForms] = useState<Record<string, { titre: string; lien: string }>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/tts/programmes")
      .then((r) => r.json())
      .then((d) => setProgrammes(d.programmes ?? []))
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  async function handleAddProgramme(e: React.FormEvent) {
    e.preventDefault();
    if (!numeroMois) return;
    setSavingProgramme(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tts/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_mois: Number(numeroMois), titre: titreProgramme || null }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setProgrammes((prev) => [...prev, { ...d.programme, videos: [] }].sort((a, b) => a.numero_mois - b.numero_mois));
      setNumeroMois("");
      setTitreProgramme("");
    } finally {
      setSavingProgramme(false);
    }
  }

  async function handleDeleteProgramme(id: string) {
    const res = await fetch("/api/admin/tts/programmes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setProgrammes((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAddVideo(programmeId: string) {
    const form = videoForms[programmeId];
    if (!form?.titre.trim() || !form?.lien.trim()) return;
    setSavingVideo(programmeId);
    setError(null);
    try {
      const programme = programmes.find((p) => p.id === programmeId);
      const res = await fetch("/api/admin/tts/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programme_id: programmeId,
          titre: form.titre,
          lien_youtube: form.lien,
          ordre: (programme?.videos.length ?? 0) + 1,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setProgrammes((prev) => prev.map((p) => p.id === programmeId ? { ...p, videos: [...p.videos, d.video] } : p));
      setVideoForms((prev) => ({ ...prev, [programmeId]: { titre: "", lien: "" } }));
    } finally {
      setSavingVideo(null);
    }
  }

  async function handleDeleteVideo(programmeId: string, videoId: string) {
    const res = await fetch("/api/admin/tts/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: videoId }),
    });
    if (res.ok) {
      setProgrammes((prev) => prev.map((p) => p.id === programmeId ? { ...p, videos: p.videos.filter((v) => v.id !== videoId) } : p));
    }
  }

  return (
    <div>
      <PageHeader title="Sport Time To Start" subtitle="Un programme par mois, exactement 3 vidéos YouTube" />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <form onSubmit={handleAddProgramme} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="number"
          min={1}
          placeholder="N° du mois (ex: 1)"
          value={numeroMois}
          onChange={(e) => setNumeroMois(e.target.value)}
          style={{ ...inputStyle, maxWidth: 160 }}
        />
        <input
          type="text"
          placeholder="Titre (optionnel)"
          value={titreProgramme}
          onChange={(e) => setTitreProgramme(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={savingProgramme} style={btnPrimary}>
          {savingProgramme ? "..." : "+ Programme"}
        </button>
      </form>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {programmes.map((p) => (
            <div key={p.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 15 }}>
                  Mois {p.numero_mois} {p.titre ? `— ${p.titre}` : ""} <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>({p.videos.length}/3)</span>
                </p>
                <button onClick={() => handleDeleteProgramme(p.id)} style={btnGhost}>Supprimer</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {p.videos.map((v) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "var(--admin-card)", borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--admin-text)" }}>{v.titre}</p>
                      <a href={v.lien_youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3B82F6" }}>{v.lien_youtube}</a>
                    </div>
                    <button onClick={() => handleDeleteVideo(p.id, v.id)} style={btnGhost}>✕</button>
                  </div>
                ))}
              </div>

              {p.videos.length < 3 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Titre vidéo"
                    value={videoForms[p.id]?.titre ?? ""}
                    onChange={(e) => setVideoForms((prev) => ({ ...prev, [p.id]: { titre: e.target.value, lien: prev[p.id]?.lien ?? "" } }))}
                    style={inputStyle}
                  />
                  <input
                    type="url"
                    placeholder="Lien YouTube"
                    value={videoForms[p.id]?.lien ?? ""}
                    onChange={(e) => setVideoForms((prev) => ({ ...prev, [p.id]: { titre: prev[p.id]?.titre ?? "", lien: e.target.value } }))}
                    style={inputStyle}
                  />
                  <button onClick={() => handleAddVideo(p.id)} disabled={savingVideo === p.id} style={btnPrimary}>
                    {savingVideo === p.id ? "..." : "+ Vidéo"}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--admin-text-muted)", fontStyle: "italic", margin: 0 }}>3 vidéos complètes.</p>
              )}
            </div>
          ))}
          {programmes.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucun programme pour l&apos;instant.</p>}
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px", backgroundColor: "#B22222", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
};
const btnGhost: React.CSSProperties = {
  padding: "5px 10px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 6, color: "var(--admin-text-muted)", fontSize: 12, cursor: "pointer",
};
