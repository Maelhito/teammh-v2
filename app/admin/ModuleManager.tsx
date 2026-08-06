"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { Module } from "@/lib/modules";
import type { ModuleContent } from "@/lib/modules-content";

export interface ModuleWithVideos extends Module {
  videoLabels: string[];
}

interface Props {
  modules: ModuleWithVideos[];
  initialContent: Record<string, ModuleContent>;
}

// Modules qui ont un second slot PDF, avec son label
const MODULE_PDF2_LABEL: Record<string, string> = {
  "module-3": "Batch cooking",
};

// Modules qui ont une image (image_url_1), avec son label
const MODULE_IMAGE_LABEL: Record<string, string> = {
  "module-2": "📸 Photo matériel mois 2",
};

export default function ModuleManager({ modules, initialContent }: Props) {
  const [content, setContent] = useState<Record<string, ModuleContent>>(initialContent);

  // Fetch fresh content from Supabase on mount (fiabilise l'affichage des badges PDF)
  useEffect(() => {
    fetch("/api/admin/modules-content")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          setContent(data as Record<string, ModuleContent>);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{ width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0 }}>
          GÉRER LES MODULES
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {modules.map((module, idx) => (
          <ModuleRow
            key={module.slug}
            index={idx + 1}
            module={module}
            initialContent={content[module.slug] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Modules avec lien Canva (à la place du PDF principal) ───────────────────
const MODULE_CANVA_LABEL: Record<string, string> = {
  "module-3": "🔗 Lien Canva - Guide des équivalences",
};

// ─── Canva Link Section ───────────────────────────────────────────────────────

function CanvaLinkSection({ label, slug, initialUrl }: { label: string; slug: string; initialUrl: string | null | undefined }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { setUrl(initialUrl ?? ""); }, [initialUrl]);

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/canva-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, url }),
    });
    const data = await res.json();
    setSaving(false);
    setMsg(res.ok ? "✓ Sauvegardé" : (data.error ?? "Erreur"));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.canva.com/..."
          style={{ flex: 1, minWidth: 0, backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 12px", color: "#FFFFFF", fontSize: 13, outline: "none" }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ backgroundColor: saving ? "#8B1515" : "#B22222", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", flexShrink: 0 }}
        >
          {saving ? "…" : "OK"}
        </button>
      </div>
      {msg && <p style={{ fontSize: 11, margin: "4px 0 0", color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msg}</p>}
    </div>
  );
}

// ─── Visio Replays Admin (module-8 & module-9) ───────────────────────────────

const VISIO_CATEGORIES_BY_MODULE: Record<string, ReadonlyArray<{ key: string; label: string }>> = {
  "module-8": [
    { key: "boost_mental", label: "💬 Tes interrogations du Quotidien" },
  ],
  "module-9": [
    { key: "visio_stretching", label: "🧘 Séances Mobilité" },
  ],
};

interface VisioReplay { id: string; categorie: string; video_url: string; titre: string | null; }

function VisioAdminSection({ moduleSlug }: { moduleSlug: string }) {
  const VISIO_CATEGORIES = VISIO_CATEGORIES_BY_MODULE[moduleSlug] ?? [];
  const initState = Object.fromEntries(VISIO_CATEGORIES.map((c) => [c.key, ""]));
  const initMode = Object.fromEntries(VISIO_CATEGORIES.map((c) => [c.key, "url" as const]));
  const [replays, setReplays] = useState<VisioReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrls, setNewUrls] = useState<Record<string, string>>(initState);
  const [newTitres, setNewTitres] = useState<Record<string, string>>(initState);
  const [addModes, setAddModes] = useState<Record<string, "url" | "file">>(initMode);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/admin/visio-replays")
      .then((r) => r.json())
      .then((d) => setReplays(d.replays ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveReplayUrl(categorie: string, video_url: string, titre: string | null) {
    const res = await fetch("/api/admin/visio-replays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, video_url, titre }),
    });
    const data = await res.json();
    if (res.ok) {
      setReplays((p) => [...p, data.replay]);
      setMsgs((p) => ({ ...p, [categorie]: "✓ Ajouté" }));
    } else {
      setMsgs((p) => ({ ...p, [categorie]: data.error ?? "Erreur" }));
    }
  }

  async function addReplay(categorie: string) {
    const url = newUrls[categorie]?.trim();
    if (!url) return;
    setAdding((p) => ({ ...p, [categorie]: true }));
    setMsgs((p) => ({ ...p, [categorie]: "" }));
    await saveReplayUrl(categorie, url, newTitres[categorie]?.trim() || null);
    setNewUrls((p) => ({ ...p, [categorie]: "" }));
    setNewTitres((p) => ({ ...p, [categorie]: "" }));
    setAdding((p) => ({ ...p, [categorie]: false }));
  }

  async function uploadVideo(categorie: string, file: File) {
    const titre = newTitres[categorie]?.trim() || file.name.replace(/\.[^.]+$/, "");
    setAdding((p) => ({ ...p, [categorie]: true }));
    setMsgs((p) => ({ ...p, [categorie]: "Upload en cours…" }));
    setUploadProgress((p) => ({ ...p, [categorie]: 0 }));
    try {
      // 1. Obtenir la signed URL
      const urlRes = await fetch("/api/admin/video-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorie, filename: file.name }),
      });
      if (!urlRes.ok) {
        const d = await urlRes.json();
        setMsgs((p) => ({ ...p, [categorie]: d.error ?? "Erreur URL" }));
        return;
      }
      const { token, storagePath, publicUrl } = await urlRes.json();

      // 2. Upload direct navigateur → Supabase Storage
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("visio-videos")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type || "video/mp4",
          // @ts-expect-error onUploadProgress disponible dans supabase-js récent
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            if (evt.total > 0) setUploadProgress((p) => ({ ...p, [categorie]: Math.round((evt.loaded / evt.total) * 100) }));
          },
        });

      if (uploadError) {
        setMsgs((p) => ({ ...p, [categorie]: uploadError.message ?? "Erreur upload" }));
        return;
      }

      // 3. Sauvegarder l'URL publique en DB
      await saveReplayUrl(categorie, publicUrl, titre);
      setNewTitres((p) => ({ ...p, [categorie]: "" }));
      if (fileRefs.current[categorie]) fileRefs.current[categorie]!.value = "";
    } catch (err) {
      setMsgs((p) => ({ ...p, [categorie]: err instanceof Error ? err.message : "Erreur" }));
    } finally {
      setAdding((p) => ({ ...p, [categorie]: false }));
      setUploadProgress((p) => ({ ...p, [categorie]: 0 }));
    }
  }

  async function deleteReplay(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/admin/visio-replays?id=${id}`, { method: "DELETE" });
    if (res.ok) setReplays((p) => p.filter((r) => r.id !== id));
    setDeleting(null);
  }

  return (
    <div style={{ marginTop: 8 }}>
      {loading ? (
        <p style={{ color: "#555", fontSize: "0.78rem", textAlign: "center", padding: 12 }}>Chargement…</p>
      ) : (
        VISIO_CATEGORIES.map((cat) => {
          const catReplays = replays.filter((r) => r.categorie === cat.key);
          return (
            <div key={cat.key} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.04em", fontWeight: 700 }}>
                {cat.label}
              </p>

              {/* Vidéos existantes */}
              {catReplays.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 10px", backgroundColor: "#0D0D0D", borderRadius: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.titre && <p style={{ fontSize: 11, color: "#F5F5F0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titre}</p>}
                    <p style={{ fontSize: 10, color: "#555", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.video_url}</p>
                  </div>
                  <button
                    onClick={() => deleteReplay(r.id)}
                    disabled={deleting === r.id}
                    style={{ padding: "3px 8px", backgroundColor: "transparent", border: "1px solid #B22222", borderRadius: 6, color: "#B22222", fontSize: "0.7rem", cursor: deleting === r.id ? "not-allowed" : "pointer", flexShrink: 0, opacity: deleting === r.id ? 0.5 : 1 }}
                  >
                    {deleting === r.id ? "…" : "Supprimer"}
                  </button>
                </div>
              ))}

              {/* Ajouter une vidéo */}
              <input
                type="text"
                placeholder="Titre (optionnel)"
                value={newTitres[cat.key] ?? ""}
                onChange={(e) => setNewTitres((p) => ({ ...p, [cat.key]: e.target.value }))}
                style={{ width: "100%", backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px", color: "#FFF", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
              />

              {/* Toggle URL / MP4 */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {(["url", "file"] as const).map(mode => (
                  <button key={mode} onClick={() => setAddModes(p => ({ ...p, [cat.key]: mode }))}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                      backgroundColor: addModes[cat.key] === mode ? "#B22222" : "#1a1a1a",
                      color: addModes[cat.key] === mode ? "#fff" : "#666" }}>
                    {mode === "url" ? "🔗 Lien YouTube" : "📁 Fichier MP4"}
                  </button>
                ))}
              </div>

              {addModes[cat.key] === "url" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={newUrls[cat.key] ?? ""}
                    onChange={(e) => setNewUrls((p) => ({ ...p, [cat.key]: e.target.value }))}
                    style={{ flex: 1, minWidth: 0, backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 10px", color: "#FFF", fontSize: 12, outline: "none" }}
                  />
                  <button
                    onClick={() => addReplay(cat.key)}
                    disabled={!!adding[cat.key]}
                    style={{ backgroundColor: adding[cat.key] ? "#8B1515" : "#B22222", color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: adding[cat.key] ? "not-allowed" : "pointer", flexShrink: 0 }}
                  >
                    {adding[cat.key] ? "…" : "+ Ajouter"}
                  </button>
                </div>
              ) : (
                /* Mode fichier MP4 */
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", backgroundColor: "#0D0D0D", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.15)", cursor: adding[cat.key] ? "not-allowed" : "pointer" }}>
                    <span style={{ fontSize: 18 }}>📁</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      {adding[cat.key] ? `Upload… ${uploadProgress[cat.key] ?? 0}%` : "Choisir un fichier MP4 / MOV"}
                    </span>
                    <input
                      ref={el => { fileRefs.current[cat.key] = el; }}
                      type="file" accept="video/mp4,video/mov,video/quicktime,.mp4,.mov"
                      disabled={!!adding[cat.key]}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(cat.key, f); }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {adding[cat.key] && uploadProgress[cat.key] > 0 && (
                    <div style={{ marginTop: 6, height: 4, backgroundColor: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${uploadProgress[cat.key]}%`, backgroundColor: "#B22222", transition: "width 0.3s", borderRadius: 99 }} />
                    </div>
                  )}
                </div>
              )}

              {msgs[cat.key] && (
                <p style={{ fontSize: 11, margin: "4px 0 0", color: msgs[cat.key].startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msgs[cat.key]}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Filename sanitizer ───────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  // On prend la partie avant le PREMIER "." pour éviter les doubles extensions
  // (ex: "fiche.pdf_compressé.pdf" → base = "fiche") puis on force l'extension .pdf
  const dotIdx = name.indexOf(".");
  const raw = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // retirer les diacritiques (accents)
    .replace(/[^a-zA-Z0-9_-]/g, "_")  // remplacer les caractères invalides
    .replace(/_+/g, "_")               // collaper les underscores multiples
    .replace(/^_|_$/g, "");            // supprimer les underscores en début/fin
  return (clean || "document") + ".pdf";
}

// ─── PDF Section ─────────────────────────────────────────────────────────────

function PdfSection({
  label,
  slug,
  slot,
  pdfUrl,
  pdfName,
}: {
  label: string;
  slug: string;
  slot: "1" | "2";
  pdfUrl: string | null | undefined;
  pdfName: string | null | undefined;
}) {
  const [uploaded, setUploaded] = useState<{ name: string } | null>(
    pdfUrl ? { name: pdfName ?? "document.pdf" } : null
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfMsg, setPdfMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync si les props changent (après fetch initial dans le parent)
  useEffect(() => {
    setUploaded(pdfUrl ? { name: pdfName ?? "document.pdf" } : null);
  }, [pdfUrl, pdfName]);

  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const safeFilename = sanitizeFilename(file.name);
    setUploading(true);
    setProgress(0);
    setPdfMsg("");

    try {
      // Étape 1 : obtenir la signed upload URL (côté serveur, auth admin)
      const urlRes = await fetch("/api/admin/pdf-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, filename: safeFilename, slot }),
      });
      if (!urlRes.ok) {
        const d = await urlRes.json();
        setPdfMsg(d.error ?? "Erreur génération URL");
        return;
      }
      const { signedUrl, token, path: storagePath } = await urlRes.json();

      // Étape 2 : upload direct navigateur → Supabase Storage (bypass limite 4.5 MB Vercel)
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("module-pdfs")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: "application/pdf",
          // @ts-expect-error — onUploadProgress disponible dans @supabase/storage-js récent
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            if (evt.total > 0) setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        });

      if (uploadError) {
        setPdfMsg(uploadError.message ?? "Erreur upload");
        return;
      }

      // Étape 3 : confirmer côté serveur (mise à jour DB + push notification)
      const confirmRes = await fetch("/api/admin/pdf-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, filename: safeFilename, slot }),
      });
      const confirmData = await confirmRes.json();

      if (confirmRes.ok) {
        setUploaded({ name: confirmData.name });
        setPdfMsg("✓ PDF uploadé");
      } else {
        setPdfMsg(confirmData.error ?? "Erreur confirmation");
      }
    } catch (err) {
      setPdfMsg(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
        📄 {label}
      </label>

      {uploaded ? (
        /* ── PDF présent ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Badge vert */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              backgroundColor: "rgba(74,222,128,0.15)",
              border: "1px solid rgba(74,222,128,0.4)",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 12,
              color: "#4ADE80",
              fontWeight: 700,
            }}>
              ✅ PDF ajouté
            </span>
          </div>
          {/* Nom du fichier */}
          <span style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            paddingLeft: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {uploaded.name}
          </span>
          {/* Bouton remplacer */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              alignSelf: "flex-start",
              backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? `Upload… ${progress > 0 ? `${progress}%` : ""}` : "🔄 Remplacer le PDF"}
          </button>
        </div>
      ) : (
        /* ── Pas de PDF ── */
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            backgroundColor: "transparent",
            border: "1px dashed rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            cursor: uploading ? "not-allowed" : "pointer",
            width: "100%",
            textAlign: "center",
          }}
        >
          {uploading ? `Upload en cours… ${progress > 0 ? `${progress}%` : ""}` : "↑ Uploader un PDF"}
        </button>
      )}

      {/* Barre de progression */}
      {uploading && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, backgroundColor: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "#B22222",
                borderRadius: 2,
                transition: "width 0.2s ease",
              }}
            />
          </div>
          {progress > 0 && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "4px 0 0", textAlign: "right" }}>
              {progress}%
            </p>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={uploadPdf} />
      {pdfMsg && (
        <p style={{ fontSize: 11, margin: "6px 0 0", color: pdfMsg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>
          {pdfMsg}
        </p>
      )}
    </div>
  );
}

// ─── Image Section ────────────────────────────────────────────────────────────

function ImageSection({
  label,
  slug,
  imageUrl,
}: {
  label: string;
  slug: string;
  imageUrl: string | null | undefined;
}) {
  const [uploaded, setUploaded] = useState<string | null>(imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setUploaded(imageUrl ?? null); }, [imageUrl]);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    setUploading(true);
    setProgress(0);
    setMsg("");

    try {
      const urlRes = await fetch("/api/admin/image-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, filename }),
      });
      if (!urlRes.ok) { const d = await urlRes.json(); setMsg(d.error ?? "Erreur URL"); return; }
      const { token, storagePath } = await urlRes.json();

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("module-image")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type || "image/jpeg",
          // @ts-expect-error onUploadProgress disponible dans supabase-js récent
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            if (evt.total > 0) setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        });

      if (uploadError) { setMsg(uploadError.message ?? "Erreur upload"); return; }

      const confirmRes = await fetch("/api/admin/image-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, filename }),
      });
      const confirmData = await confirmRes.json();
      if (confirmRes.ok) { setUploaded(confirmData.url); setMsg("✓ Image uploadée"); }
      else setMsg(confirmData.error ?? "Erreur confirmation");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
        {label}
      </label>

      {uploaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <img src={uploaded} alt="aperçu" style={{ width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ alignSelf: "flex-start", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: uploading ? "not-allowed" : "pointer" }}
          >
            {uploading ? `Upload… ${progress > 0 ? `${progress}%` : ""}` : "🔄 Remplacer l'image"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ backgroundColor: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 8, padding: "10px 16px", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: uploading ? "not-allowed" : "pointer", width: "100%", textAlign: "center" }}
        >
          {uploading ? `Upload en cours… ${progress > 0 ? `${progress}%` : ""}` : "↑ Uploader une image"}
        </button>
      )}

      {uploading && progress > 0 && (
        <div style={{ marginTop: 8, height: 4, backgroundColor: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#B22222", transition: "width 0.2s ease", borderRadius: 2 }} />
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />
      {msg && <p style={{ fontSize: 11, margin: "6px 0 0", color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msg}</p>}
    </div>
  );
}

// ─── Module Row ───────────────────────────────────────────────────────────────

function ModuleRow({
  index,
  module,
  initialContent,
}: {
  index: number;
  module: ModuleWithVideos;
  initialContent: ModuleContent | null;
}) {
  const count = module.videoLabels.length;
  const [isOpen, setIsOpen] = useState(false);
  const isMissionCaddie = module.slug === "module-7";

  const [videoUrls, setVideoUrls] = useState<string[]>(
    Array.from({ length: count }, (_, i) => {
      const key = `video_url_${i + 1}` as keyof ModuleContent;
      return (initialContent?.[key] as string | null) ?? "";
    })
  );
  const [videoTitles, setVideoTitles] = useState<string[]>(
    Array.from({ length: count }, (_, i) => {
      const key = `video_title_${i + 1}` as keyof ModuleContent;
      return (initialContent?.[key] as string | null) ?? "";
    })
  );
  const [savingVideo, setSavingVideo] = useState<boolean[]>(Array(count).fill(false));
  const [savingTitle, setSavingTitle] = useState<boolean[]>(Array(count).fill(false));
  const [videoMsg, setVideoMsg] = useState<string[]>(Array(count).fill(""));
  const [titleMsg, setTitleMsg] = useState<string[]>(Array(count).fill(""));

  // Sync video URLs et titres quand initialContent change
  useEffect(() => {
    setVideoUrls(
      Array.from({ length: count }, (_, i) => {
        const key = `video_url_${i + 1}` as keyof ModuleContent;
        return (initialContent?.[key] as string | null) ?? "";
      })
    );
    setVideoTitles(
      Array.from({ length: count }, (_, i) => {
        const key = `video_title_${i + 1}` as keyof ModuleContent;
        return (initialContent?.[key] as string | null) ?? "";
      })
    );
  }, [initialContent, count]);

  async function saveTitle(i: number) {
    setSavingTitle((p) => { const n = [...p]; n[i] = true; return n; });
    setTitleMsg((p) => { const n = [...p]; n[i] = ""; return n; });

    const field = `video_title_${i + 1}`;
    const res = await fetch("/api/admin/video-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: module.slug, field, title: videoTitles[i] }),
    });
    const data = await res.json();

    setSavingTitle((p) => { const n = [...p]; n[i] = false; return n; });
    setTitleMsg((p) => {
      const n = [...p];
      n[i] = res.ok ? "✓ Sauvegardé" : (data.error ?? "Erreur");
      return n;
    });
  }

  async function saveVideo(i: number) {
    setSavingVideo((p) => { const n = [...p]; n[i] = true; return n; });
    setVideoMsg((p) => { const n = [...p]; n[i] = ""; return n; });

    const field = `video_url_${i + 1}`;
    const res = await fetch("/api/admin/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: module.slug, field, url: videoUrls[i] }),
    });
    const data = await res.json();

    setSavingVideo((p) => { const n = [...p]; n[i] = false; return n; });
    setVideoMsg((p) => {
      const n = [...p];
      n[i] = res.ok ? "✓ Sauvegardé" : (data.error ?? "Erreur");
      return n;
    });
  }

  const pdf2Label = MODULE_PDF2_LABEL[module.slug];
  const imageLabel = MODULE_IMAGE_LABEL[module.slug];
  const canvaLabel = MODULE_CANVA_LABEL[module.slug];
  const isVisio = module.slug === "module-8" || module.slug === "module-9";

  return (
    <div style={{ backgroundColor: "#1A1A1A", borderRadius: 12, border: "1px solid #2a2a2a", overflow: "hidden" }}>
      {/* En-tête accordéon */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="font-title" style={{ fontSize: "1rem", color: "#B22222", flexShrink: 0 }}>
            {String(index).padStart(2, "0")}
          </span>
          <span className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#F5F5F0" }}>
            {module.title.toUpperCase()}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#555", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Contenu dépliable */}
      {isOpen && (
        <div style={{ padding: "0 20px 18px" }}>
          {/* Sections replays (module-8 : Tes interrogations du Quotidien, module-9 : Séances Mobilité) */}
          {isVisio && <VisioAdminSection moduleSlug={module.slug} />}

          {/* Champs vidéo (pas pour module-8) */}
          {!isVisio && module.videoLabels.map((label, i) => (
            <div key={i}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
                  🎥 {label}
                </label>

                {/* Champ titre custom (uniquement Mission Caddie) */}
                {isMissionCaddie && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={videoTitles[i] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVideoTitles((p) => { const n = [...p]; n[i] = val; return n; });
                        }}
                        placeholder="Titre de la mission (ex: Les produits ultra-transformés)"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          backgroundColor: "#0D0D0D",
                          border: "1px solid rgba(178,34,34,0.4)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          color: "#FFFFFF",
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => saveTitle(i)}
                        disabled={savingTitle[i]}
                        style={{
                          backgroundColor: savingTitle[i] ? "#8B1515" : "#B22222",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "0 14px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: savingTitle[i] ? "not-allowed" : "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {savingTitle[i] ? "…" : "Titre"}
                      </button>
                    </div>
                    {titleMsg[i] && (
                      <p style={{ fontSize: 11, margin: "3px 0 0", color: titleMsg[i].startsWith("✓") ? "#4ADE80" : "#F87171" }}>
                        {titleMsg[i]}
                      </p>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="url"
                    value={videoUrls[i] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoUrls((p) => { const n = [...p]; n[i] = val; return n; });
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      backgroundColor: "#0D0D0D",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "9px 12px",
                      color: "#FFFFFF",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => saveVideo(i)}
                    disabled={savingVideo[i]}
                    style={{
                      backgroundColor: savingVideo[i] ? "#8B1515" : "#B22222",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "0 16px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: savingVideo[i] ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {savingVideo[i] ? "…" : "OK"}
                  </button>
                </div>
                {videoMsg[i] && (
                  <p style={{ fontSize: 11, margin: "4px 0 0", color: videoMsg[i].startsWith("✓") ? "#4ADE80" : "#F87171" }}>
                    {videoMsg[i]}
                  </p>
                )}
              </div>

              {/* PDF Batch cooking juste après Vidéo 2 (index 1) pour module-3 */}
              {pdf2Label && i === 1 && (
                <PdfSection
                  label={pdf2Label}
                  slug={module.slug}
                  slot="2"
                  pdfUrl={initialContent?.pdf_url_2}
                  pdfName={initialContent?.pdf_name_2}
                />
              )}
            </div>
          ))}

          {/* Image (module-2 : photo matériel) */}
          {imageLabel && (
            <ImageSection
              label={imageLabel}
              slug={module.slug}
              imageUrl={initialContent?.image_url_1}
            />
          )}

          {/* PDF principal ou lien Canva (pas pour module-8) */}
          {!isVisio && (canvaLabel ? (
            <CanvaLinkSection
              label={canvaLabel}
              slug={module.slug}
              initialUrl={initialContent?.lien_canva_equivalences}
            />
          ) : (
            <PdfSection
              label="PDF"
              slug={module.slug}
              slot="1"
              pdfUrl={initialContent?.pdf_url}
              pdfName={initialContent?.pdf_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
