"use client";

import { useState, useRef } from "react";
import type { Module } from "@/lib/modules";
import type { ModuleContent } from "@/lib/modules-content";

export interface ModuleWithVideos extends Module {
  videoLabels: string[]; // titres des VIDEO:: # dans le MDX
}

interface Props {
  modules: ModuleWithVideos[];
  initialContent: Record<string, ModuleContent>;
}

export default function ModuleManager({ modules, initialContent }: Props) {
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
            initialContent={initialContent[module.slug] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function ModuleRow({
  index,
  module,
  initialContent,
}: {
  index: number;
  module: ModuleWithVideos;
  initialContent: ModuleContent | null;
}) {
  const videoFields = ["video_url_1", "video_url_2", "video_url_3"] as const;

  const [videoUrls, setVideoUrls] = useState<[string, string, string]>([
    initialContent?.video_url_1 ?? "",
    initialContent?.video_url_2 ?? "",
    initialContent?.video_url_3 ?? "",
  ]);
  const [savingVideo, setSavingVideo] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [videoMsg, setVideoMsg] = useState<[string, string, string]>(["", "", ""]);

  const [pdfInfo, setPdfInfo] = useState<{ url: string; name: string } | null>(
    initialContent?.pdf_url
      ? { url: initialContent.pdf_url, name: initialContent.pdf_name ?? "document.pdf" }
      : null
  );
  const [uploading, setUploading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveVideo(i: 0 | 1 | 2) {
    setSavingVideo((p) => { const n = [...p] as [boolean, boolean, boolean]; n[i] = true; return n; });
    setVideoMsg((p) => { const n = [...p] as [string, string, string]; n[i] = ""; return n; });

    const res = await fetch("/api/admin/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: module.slug, field: videoFields[i], url: videoUrls[i] }),
    });
    const data = await res.json();

    setSavingVideo((p) => { const n = [...p] as [boolean, boolean, boolean]; n[i] = false; return n; });
    setVideoMsg((p) => { const n = [...p] as [string, string, string]; n[i] = res.ok ? "✓ Sauvegardé" : (data.error ?? "Erreur"); return n; });
  }

  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPdfMsg("");

    const form = new FormData();
    form.append("slug", module.slug);
    form.append("file", file);

    const res = await fetch("/api/admin/pdf", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setPdfInfo({ url: data.url, name: data.name });
      setPdfMsg("✓ PDF uploadé");
    } else {
      setPdfMsg(data.error ?? "Erreur upload");
    }
    // reset input
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ backgroundColor: "#1A1A1A", borderRadius: 12, padding: "18px 20px", border: "1px solid #2a2a2a" }}>
      {/* En-tête module */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span className="font-title" style={{ fontSize: "1rem", color: "#B22222", flexShrink: 0 }}>
          {String(index).padStart(2, "0")}
        </span>
        <span className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#F5F5F0" }}>
          {module.title.toUpperCase()}
        </span>
      </div>

      {/* Champs vidéo */}
      {module.videoLabels.map((label, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
            🎥 {label}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              value={videoUrls[i] ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setVideoUrls((p) => { const n = [...p] as [string, string, string]; n[i] = val; return n; });
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
              onClick={() => saveVideo(i as 0 | 1 | 2)}
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
            <p style={{ fontSize: 11, marginTop: 4, margin: "4px 0 0", color: videoMsg[i].startsWith("✓") ? "#4ADE80" : "#F87171" }}>
              {videoMsg[i]}
            </p>
          )}
        </div>
      ))}

      {/* Section PDF */}
      <div>
        <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
          📄 PDF
        </label>
        {pdfInfo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#4ADE80", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ✓ {pdfInfo.name}
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Remplacer
            </button>
          </div>
        ) : (
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
            {uploading ? "Upload en cours..." : "↑ Uploader un PDF"}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={uploadPdf} />
        {pdfMsg && (
          <p style={{ fontSize: 11, marginTop: 4, margin: "4px 0 0", color: pdfMsg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>
            {pdfMsg}
          </p>
        )}
      </div>
    </div>
  );
}
