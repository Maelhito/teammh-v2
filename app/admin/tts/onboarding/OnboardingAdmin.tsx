"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader } from "../TtsShared";

interface Video {
  id: string;
  titre: string;
  lien_youtube: string;
  cover_url: string | null;
  ordre: number;
}

interface Module {
  id: string;
  titre: string;
  ordre: number;
  videos: Video[];
}

export default function OnboardingAdmin() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleTitre, setModuleTitre] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  const [videoForms, setVideoForms] = useState<Record<string, { titre: string; lien: string; cover: string }>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/tts/modules")
      .then((r) => r.json())
      .then((d) => setModules(d.modules ?? []))
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleTitre.trim()) return;
    setSavingModule(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tts/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: moduleTitre, ordre: modules.length }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setModules((prev) => [...prev, { ...d.module, videos: [] }]);
      setModuleTitre("");
    } finally {
      setSavingModule(false);
    }
  }

  async function handleDeleteModule(id: string) {
    const res = await fetch("/api/admin/tts/modules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setModules((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleAddVideo(moduleId: string) {
    const form = videoForms[moduleId];
    if (!form?.titre.trim() || !form?.lien.trim()) return;
    setSavingVideo(moduleId);
    setError(null);
    try {
      const module = modules.find((m) => m.id === moduleId);
      const res = await fetch("/api/admin/tts/modules-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: moduleId,
          titre: form.titre,
          lien_youtube: form.lien,
          cover_url: form.cover || null,
          ordre: module?.videos.length ?? 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, videos: [...m.videos, d.video] } : m));
      setVideoForms((prev) => ({ ...prev, [moduleId]: { titre: "", lien: "", cover: "" } }));
    } finally {
      setSavingVideo(null);
    }
  }

  async function handleDeleteVideo(moduleId: string, videoId: string) {
    const res = await fetch("/api/admin/tts/modules-videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: videoId }),
    });
    if (res.ok) {
      setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, videos: m.videos.filter((v) => v.id !== videoId) } : m));
    }
  }

  return (
    <div>
      <PageHeader title="Onboarding Time To Start" subtitle="Blocs (Démarrage, Sport, Nutrition, Mindset...) parcourus dans l'ordre, vidéos YouTube cochées une fois vues" />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <form onSubmit={handleAddModule} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nom du bloc (ex: Démarrage, Sport, Mindset...)"
          value={moduleTitre}
          onChange={(e) => setModuleTitre(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={savingModule} style={btnPrimary}>
          {savingModule ? "..." : "+ Bloc"}
        </button>
      </form>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {modules.map((m, idx) => (
            <div key={m.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 15 }}>
                  {idx + 1}. {m.titre}
                </p>
                <button onClick={() => handleDeleteModule(m.id)} style={btnGhost}>Supprimer le bloc</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {m.videos.map((v) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "var(--admin-card)", borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--admin-text)" }}>{v.titre}</p>
                      <a href={v.lien_youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3B82F6" }}>{v.lien_youtube}</a>
                    </div>
                    <button onClick={() => handleDeleteVideo(m.id, v.id)} style={btnGhost}>✕</button>
                  </div>
                ))}
                {m.videos.length === 0 && <p style={{ fontSize: 12, color: "var(--admin-text-muted)", fontStyle: "italic", margin: 0 }}>Aucune vidéo.</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 6 }}>
                <input
                  type="text"
                  placeholder="Titre vidéo"
                  value={videoForms[m.id]?.titre ?? ""}
                  onChange={(e) => setVideoForms((prev) => ({ ...prev, [m.id]: { ...prev[m.id], titre: e.target.value, lien: prev[m.id]?.lien ?? "", cover: prev[m.id]?.cover ?? "" } }))}
                  style={inputStyle}
                />
                <input
                  type="url"
                  placeholder="Lien YouTube"
                  value={videoForms[m.id]?.lien ?? ""}
                  onChange={(e) => setVideoForms((prev) => ({ ...prev, [m.id]: { ...prev[m.id], lien: e.target.value, titre: prev[m.id]?.titre ?? "", cover: prev[m.id]?.cover ?? "" } }))}
                  style={inputStyle}
                />
                <input
                  type="url"
                  placeholder="Image couverture (optionnel)"
                  value={videoForms[m.id]?.cover ?? ""}
                  onChange={(e) => setVideoForms((prev) => ({ ...prev, [m.id]: { ...prev[m.id], cover: e.target.value, titre: prev[m.id]?.titre ?? "", lien: prev[m.id]?.lien ?? "" } }))}
                  style={inputStyle}
                />
                <button onClick={() => handleAddVideo(m.id)} disabled={savingVideo === m.id} style={btnPrimary}>
                  {savingVideo === m.id ? "..." : "+ Vidéo"}
                </button>
              </div>
            </div>
          ))}
          {modules.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucun bloc pour l&apos;instant.</p>}
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
