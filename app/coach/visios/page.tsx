"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Replay { id: string; categorie: string; video_url: string; titre: string | null; }

const CATEGORIES = [
  { key: "boost_mental",     label: "🧠 Boost Mental",      color: "#8B5CF6" },
  { key: "visio_sport",      label: "💪 Visio Sport",        color: "#B22222" },
  { key: "visio_stretching", label: "🧘 Visio Mobilité",     color: "#10B981" },
] as const;

function isVideoFile(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("/storage/v1/object/public/visio-videos/");
}

function ytThumb(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export default function CoachVisiosPage() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrls, setNewUrls]   = useState<Record<string, string>>({ boost_mental: "", visio_sport: "", visio_stretching: "" });
  const [newTitres, setNewTitres] = useState<Record<string, string>>({ boost_mental: "", visio_sport: "", visio_stretching: "" });
  const [addModes, setAddModes] = useState<Record<string, "url" | "file">>({ boost_mental: "url", visio_sport: "url", visio_stretching: "url" });
  const [adding, setAdding]   = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msgs, setMsgs]       = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/coach/visio-replays")
      .then(r => r.json())
      .then(d => setReplays(d.replays ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function saveUrl(categorie: string, video_url: string, titre: string | null) {
    const res = await fetch("/api/coach/visio-replays", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, video_url, titre }),
    });
    const d = await res.json();
    if (res.ok) {
      setReplays(p => [...p, d.replay]);
      setMsgs(p => ({ ...p, [categorie]: "✓ Ajouté" }));
    } else {
      setMsgs(p => ({ ...p, [categorie]: d.error ?? "Erreur" }));
    }
  }

  async function addByUrl(categorie: string) {
    const url = newUrls[categorie]?.trim();
    if (!url) return;
    setAdding(p => ({ ...p, [categorie]: true }));
    setMsgs(p => ({ ...p, [categorie]: "" }));
    await saveUrl(categorie, url, newTitres[categorie]?.trim() || null);
    setNewUrls(p => ({ ...p, [categorie]: "" }));
    setNewTitres(p => ({ ...p, [categorie]: "" }));
    setAdding(p => ({ ...p, [categorie]: false }));
  }

  async function uploadVideo(categorie: string, file: File) {
    const titre = newTitres[categorie]?.trim() || file.name.replace(/\.[^.]+$/, "");
    setAdding(p => ({ ...p, [categorie]: true }));
    setMsgs(p => ({ ...p, [categorie]: "Upload…" }));
    setProgress(p => ({ ...p, [categorie]: 0 }));
    try {
      const urlRes = await fetch("/api/admin/video-signed-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorie, filename: file.name }),
      });
      if (!urlRes.ok) { const d = await urlRes.json(); setMsgs(p => ({ ...p, [categorie]: d.error ?? "Erreur URL" })); return; }
      const { token, storagePath, publicUrl } = await urlRes.json();
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("visio-videos")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type || "video/mp4",
          // @ts-expect-error onUploadProgress
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            if (evt.total > 0) setProgress(p => ({ ...p, [categorie]: Math.round((evt.loaded / evt.total) * 100) }));
          },
        });
      if (uploadError) { setMsgs(p => ({ ...p, [categorie]: uploadError.message })); return; }
      await saveUrl(categorie, publicUrl, titre);
      setNewTitres(p => ({ ...p, [categorie]: "" }));
      if (fileRefs.current[categorie]) fileRefs.current[categorie]!.value = "";
    } catch { setMsgs(p => ({ ...p, [categorie]: "Erreur réseau" })); }
    finally { setAdding(p => ({ ...p, [categorie]: false })); setProgress(p => ({ ...p, [categorie]: 0 })); }
  }

  async function del(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/coach/visio-replays?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setReplays(p => p.filter(r => r.id !== id));
    } else {
      const { error } = await res.json().catch(() => ({ error: "Erreur lors de la suppression." }));
      alert(error);
    }
    setDeleting(null);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e8e8", backgroundColor: "#f8f8f8", fontSize: 12, color: "#1a1a1a", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Portail Coach</p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>🎥 Visios de groupe</h1>
        <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0 0", fontFamily: "system-ui" }}>Ajoute les replays des visios pour tes clientes. Toutes les catégories sont accessibles à toutes.</p>
      </div>

      {loading ? (
        <p style={{ color: "#aaa", fontFamily: "system-ui", fontSize: 13 }}>Chargement…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {CATEGORIES.map(cat => {
            const catReplays = replays.filter(r => r.categorie === cat.key);
            return (
              <div key={cat.key} style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: cat.color }} />
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>{cat.label}</h2>
                  <span style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>{catReplays.length} vidéo{catReplays.length > 1 ? "s" : ""}</span>
                </div>

                {/* Vidéos existantes */}
                <div style={{ padding: "12px 18px" }}>
                  {catReplays.map(r => {
                    const thumb = isVideoFile(r.video_url) ? null : ytThumb(r.video_url);
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", backgroundColor: "#fafafa", borderRadius: 8, border: "1px solid #f0f0f0", marginBottom: 6 }}>
                        {thumb && <img src={thumb} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />}
                        {!thumb && isVideoFile(r.video_url) && (
                          <div style={{ width: 60, height: 40, backgroundColor: "#f0f0f0", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📹</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {r.titre && <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</p>}
                          <p style={{ fontSize: 10, color: "#aaa", margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.video_url}</p>
                        </div>
                        <button onClick={() => del(r.id)} disabled={deleting === r.id}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444", fontSize: 11, cursor: "pointer", fontFamily: "system-ui", flexShrink: 0, opacity: deleting === r.id ? 0.5 : 1 }}>
                          🗑
                        </button>
                      </div>
                    );
                  })}

                  {/* Formulaire ajout */}
                  <div style={{ marginTop: catReplays.length > 0 ? 12 : 0 }}>
                    <input type="text" placeholder="Titre (optionnel)" value={newTitres[cat.key] ?? ""}
                      onChange={e => setNewTitres(p => ({ ...p, [cat.key]: e.target.value }))}
                      style={{ ...inp, marginBottom: 6 }} />

                    {/* Toggle URL / MP4 */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 6, backgroundColor: "#f0f0f0", borderRadius: 7, padding: 3 }}>
                      {(["url", "file"] as const).map(mode => (
                        <button key={mode} onClick={() => setAddModes(p => ({ ...p, [cat.key]: mode }))}
                          style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            backgroundColor: addModes[cat.key] === mode ? "#fff" : "transparent",
                            color: addModes[cat.key] === mode ? cat.color : "#aaa",
                            boxShadow: addModes[cat.key] === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                          {mode === "url" ? "🔗 Lien YouTube" : "📁 Fichier MP4"}
                        </button>
                      ))}
                    </div>

                    {addModes[cat.key] === "url" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="url" placeholder="https://youtube.com/watch?v=..." value={newUrls[cat.key] ?? ""}
                          onChange={e => setNewUrls(p => ({ ...p, [cat.key]: e.target.value }))}
                          style={{ ...inp, flex: 1 }} />
                        <button onClick={() => addByUrl(cat.key)} disabled={!!adding[cat.key]}
                          style={{ padding: "0 16px", borderRadius: 8, border: "none", backgroundColor: adding[cat.key] ? "#e8e8e8" : cat.color, color: adding[cat.key] ? "#aaa" : "#fff", fontSize: 12, fontWeight: 700, cursor: adding[cat.key] ? "not-allowed" : "pointer", flexShrink: 0, fontFamily: "system-ui" }}>
                          {adding[cat.key] ? "…" : "+ Ajouter"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", backgroundColor: "#f8f8f8", borderRadius: 8, border: "1px dashed #e0e0e0", cursor: adding[cat.key] ? "not-allowed" : "pointer" }}>
                          <span style={{ fontSize: 18 }}>📁</span>
                          <span style={{ fontSize: 12, color: "#888", fontFamily: "system-ui" }}>
                            {adding[cat.key] ? `Upload… ${progress[cat.key] ?? 0}%` : "Choisir un fichier MP4 / MOV"}
                          </span>
                          <input ref={el => { fileRefs.current[cat.key] = el; }} type="file" accept="video/mp4,video/mov,video/quicktime,.mp4,.mov"
                            disabled={!!adding[cat.key]}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(cat.key, f); }}
                            style={{ display: "none" }} />
                        </label>
                        {adding[cat.key] && (progress[cat.key] ?? 0) > 0 && (
                          <div style={{ marginTop: 6, height: 4, backgroundColor: "#e8e8e8", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${progress[cat.key]}%`, backgroundColor: cat.color, transition: "width 0.3s", borderRadius: 99 }} />
                          </div>
                        )}
                      </div>
                    )}

                    {msgs[cat.key] && (
                      <p style={{ fontSize: 11, margin: "6px 0 0", color: msgs[cat.key].startsWith("✓") ? "#22C55E" : "#EF4444", fontFamily: "system-ui" }}>{msgs[cat.key]}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
