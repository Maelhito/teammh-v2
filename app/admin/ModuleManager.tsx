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

// ─── Visio Replays Admin (module-8) ──────────────────────────────────────────

const VISIO_CATEGORIES = [
  { key: "boost_mental",     label: "🧠 Boost Mental" },
  { key: "visio_sport",      label: "💪 Visio Sport" },
  { key: "visio_stretching", label: "🧘 Visio Stretching" },
] as const;

interface VisioReplay { id: string; categorie: string; video_url: string; titre: string | null; }

function VisioAdminSection() {
  const [replays, setReplays] = useState<VisioReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrls, setNewUrls] = useState<Record<string, string>>({ boost_mental: "", visio_sport: "", visio_stretching: "" });
  const [newTitres, setNewTitres] = useState<Record<string, string>>({ boost_mental: "", visio_sport: "", visio_stretching: "" });
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/visio-replays")
      .then((r) => r.json())
      .then((d) => setReplays(d.replays ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addReplay(categorie: string) {
    const url = newUrls[categorie]?.trim();
    if (!url) return;
    setAdding((p) => ({ ...p, [categorie]: true }));
    setMsgs((p) => ({ ...p, [categorie]: "" }));
    const res = await fetch("/api/admin/visio-replays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, video_url: url, titre: newTitres[categorie]?.trim() || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setReplays((p) => [...p, data.replay]);
      setNewUrls((p) => ({ ...p, [categorie]: "" }));
      setNewTitres((p) => ({ ...p, [categorie]: "" }));
      setMsgs((p) => ({ ...p, [categorie]: "✓ Ajouté" }));
    } else {
      setMsgs((p) => ({ ...p, [categorie]: data.error ?? "Erreur" }));
    }
    setAdding((p) => ({ ...p, [categorie]: false }));
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
                style={{ width: "100%", backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px", color: "#FFF", fontSize: 12, outline: "none", marginBottom: 4, boxSizing: "border-box" }}
              />
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

  const [videoUrls, setVideoUrls] = useState<string[]>(
    Array.from({ length: count }, (_, i) => {
      const key = `video_url_${i + 1}` as keyof ModuleContent;
      return (initialContent?.[key] as string | null) ?? "";
    })
  );
  const [savingVideo, setSavingVideo] = useState<boolean[]>(Array(count).fill(false));
  const [videoMsg, setVideoMsg] = useState<string[]>(Array(count).fill(""));

  // Sync video URLs quand initialContent change (après fetch dans le parent)
  useEffect(() => {
    setVideoUrls(
      Array.from({ length: count }, (_, i) => {
        const key = `video_url_${i + 1}` as keyof ModuleContent;
        return (initialContent?.[key] as string | null) ?? "";
      })
    );
  }, [initialContent, count]);

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
  const canvaLabel = MODULE_CANVA_LABEL[module.slug];
  const isVisio = module.slug === "module-8";

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
          {/* Section Visio de Groupe (module-8) */}
          {isVisio && <VisioAdminSection />}

          {/* Champs vidéo (pas pour module-8) */}
          {!isVisio && module.videoLabels.map((label, i) => (
            <div key={i}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
                  🎥 {label}
                </label>
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
