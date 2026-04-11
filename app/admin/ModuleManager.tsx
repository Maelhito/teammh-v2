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
    setUploading(true);
    setProgress(0);
    setPdfMsg("");

    try {
      // Étape 1 : obtenir la signed upload URL (côté serveur, auth admin)
      const urlRes = await fetch("/api/admin/pdf-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, filename: file.name, slot }),
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
        body: JSON.stringify({ slug, filename: file.name, slot }),
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
          {/* Champs vidéo */}
          {module.videoLabels.map((label, i) => (
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

          {/* PDF principal */}
          <PdfSection
            label="PDF"
            slug={module.slug}
            slot="1"
            pdfUrl={initialContent?.pdf_url}
            pdfName={initialContent?.pdf_name}
          />
        </div>
      )}
    </div>
  );
}
