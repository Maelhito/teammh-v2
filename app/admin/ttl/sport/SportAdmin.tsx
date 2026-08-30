"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader, FileUploadButton, VideoCard, VideoPreviewModal } from "../TtlShared";

const MATERIEL_OPTIONS = ["Élastique", "Petits haltères", "Bande de résistance"];

interface Video {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  materiel: string[] | null;
  cover_url: string | null;
  ordre: number;
}

interface Programme {
  id: string;
  numero_mois: number;
  titre: string | null;
  videos: Video[];
}

interface VideoForm {
  titre: string;
  lien: string;
  materiel: string[];
  cover: { url: string; name: string } | null;
}

export default function SportAdmin() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nomProgramme, setNomProgramme] = useState("");
  const [savingProgramme, setSavingProgramme] = useState(false);

  const [videoForms, setVideoForms] = useState<Record<string, VideoForm>>({});
  const [formVersion, setFormVersion] = useState<Record<string, number>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/ttl/programmes")
      .then((r) => r.json())
      .then((d) => setProgrammes(d.programmes ?? []))
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  /** « Séance 1 », « Séance 2 »… proposé d'office : le nom qui compte est celui du programme. */
  function titreParDefaut(programmeId: string) {
    const programme = programmes.find((p) => p.id === programmeId);
    return `Séance ${(programme?.videos.length ?? 0) + 1}`;
  }

  function getForm(programmeId: string): VideoForm {
    return videoForms[programmeId] ?? { titre: titreParDefaut(programmeId), lien: "", materiel: [], cover: null };
  }

  function setForm(programmeId: string, patch: Partial<VideoForm>) {
    setVideoForms((prev) => ({ ...prev, [programmeId]: { ...getForm(programmeId), ...patch } }));
  }

  function resetForm(programmeId: string) {
    setVideoForms((prev) => {
      const next = { ...prev };
      delete next[programmeId];
      return next;
    });
    setFormVersion((prev) => ({ ...prev, [programmeId]: (prev[programmeId] ?? 0) + 1 }));
  }

  function toggleMateriel(programmeId: string, item: string) {
    const current = getForm(programmeId).materiel;
    const next = current.includes(item) ? current.filter((m) => m !== item) : [...current, item];
    setForm(programmeId, { materiel: next });
  }

  async function handleAddProgramme(e: React.FormEvent) {
    e.preventDefault();
    if (!nomProgramme.trim()) {
      setError("Donne un nom au programme");
      return;
    }
    setSavingProgramme(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ttl/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: nomProgramme.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setProgrammes((prev) => [...prev, { ...d.programme, videos: [] }].sort((a, b) => a.numero_mois - b.numero_mois));
      setNomProgramme("");
    } finally {
      setSavingProgramme(false);
    }
  }

  async function handleDeleteProgramme(id: string) {
    const res = await fetch("/api/admin/ttl/programmes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setProgrammes((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAddVideo(programmeId: string) {
    const form = getForm(programmeId);
    if (!form.lien.trim()) {
      setError("Le lien YouTube est requis");
      return;
    }
    setSavingVideo(programmeId);
    setError(null);
    try {
      const programme = programmes.find((p) => p.id === programmeId);
      const res = await fetch("/api/admin/ttl/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programme_id: programmeId,
          titre: form.titre.trim() || titreParDefaut(programmeId),
          lien_youtube: form.lien.trim(),
          description: null,
          materiel: form.materiel,
          cover_url: form.cover?.url ?? null,
          ordre: (programme?.videos.length ?? 0) + 1,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setProgrammes((prev) => prev.map((p) => p.id === programmeId ? { ...p, videos: [...p.videos, d.video] } : p));
      resetForm(programmeId);
    } finally {
      setSavingVideo(null);
    }
  }

  async function handleDeleteVideo(programmeId: string, videoId: string) {
    const res = await fetch("/api/admin/ttl/videos", {
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
      <PageHeader title="Sport Time To Last" subtitle="Un programme, exactement 3 séances vidéo" />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <form onSubmit={handleAddProgramme} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          required
          placeholder="Nom du programme (ex: Prise en main)"
          value={nomProgramme}
          onChange={(e) => setNomProgramme(e.target.value)}
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
          {programmes.map((p) => {
            const form = getForm(p.id);
            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 15 }}>
                    {p.titre || "Programme sans nom"} <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>({p.videos.length}/3)</span>
                  </p>
                  <button onClick={() => handleDeleteProgramme(p.id)} style={btnGhost}>Supprimer</button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
                  {p.videos.map((v) => (
                    <VideoCard
                      key={v.id}
                      titre={v.titre}
                      coverUrl={v.cover_url}
                      onClick={() => setPreviewVideo(v)}
                      onDelete={() => handleDeleteVideo(p.id, v.id)}
                    />
                  ))}
                </div>

                {p.videos.length < 3 ? (
                  <div key={formVersion[p.id] ?? 0} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Séance"
                        value={form.titre}
                        onChange={(e) => setForm(p.id, { titre: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        type="url"
                        placeholder="Lien YouTube (obligatoire)"
                        value={form.lien}
                        onChange={(e) => setForm(p.id, { lien: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--admin-text-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>
                        MATÉRIEL (optionnel)
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {MATERIEL_OPTIONS.map((item) => {
                          const checked = form.materiel.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleMateriel(p.id, item)}
                              style={{
                                padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                                border: `1px solid ${checked ? "#B22222" : "var(--admin-border)"}`,
                                backgroundColor: checked ? "rgba(178,34,34,0.15)" : "transparent",
                                color: checked ? "#B22222" : "var(--admin-text-muted)",
                                fontWeight: checked ? 700 : 400,
                              }}
                            >
                              {checked ? "✓ " : ""}{item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <FileUploadButton
                      bucket="ttl-images"
                      accept="image/*"
                      label="🖼 Image de couverture (optionnel)"
                      value={form.cover}
                      onUploaded={(result) => setForm(p.id, { cover: result })}
                    />
                    <button onClick={() => handleAddVideo(p.id)} disabled={savingVideo === p.id} style={{ ...btnPrimary, alignSelf: "flex-start" }}>
                      {savingVideo === p.id ? "..." : "+ Séance"}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--admin-text-muted)", fontStyle: "italic", margin: 0 }}>3 séances complètes.</p>
                )}
              </div>
            );
          })}
          {programmes.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucun programme pour l&apos;instant.</p>}
        </div>
      )}

      {previewVideo && (
        <VideoPreviewModal
          titre={previewVideo.titre}
          lien_youtube={previewVideo.lien_youtube}
          description={previewVideo.description}
          extra={!!previewVideo.materiel?.length && (
            <p style={{ marginTop: 10, fontSize: 12, color: "var(--admin-text-muted)" }}>🧰 {previewVideo.materiel.join(", ")}</p>
          )}
          onClose={() => setPreviewVideo(null)}
        />
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
