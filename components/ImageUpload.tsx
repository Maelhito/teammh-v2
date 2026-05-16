"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  dark?: boolean;
}

export default function ImageUpload({ value, onChange, dark = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const bg     = dark ? "#111"    : "#fafafa";
  const border = dark ? "#2a2a2a" : "#e0e0e0";
  const textMuted = dark ? "#555" : "#aaa";
  const textFaint = dark ? "#333" : "#ccc";
  const textBtn   = dark ? "#666" : "#888";

  async function upload(file: File) {
    const maxMo = 20;
    if (file.size > maxMo * 1024 * 1024) { setError(`Max ${maxMo} Mo`); return; }
    setError(null); setUploading(true); setProgress(0);
    try {
      // 1. Obtenir la signed URL (côté serveur, auth)
      const urlRes = await fetch("/api/coach/image-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      if (!urlRes.ok) {
        const d = await urlRes.json();
        setError(d.error ?? "Erreur"); return;
      }
      const { token, storagePath, publicUrl } = await urlRes.json();

      // 2. Upload direct navigateur → Supabase Storage (bypass limite Vercel)
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("coach-images")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type,
          // @ts-expect-error onUploadProgress disponible dans supabase-js récent
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            if (evt.total > 0) setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        });

      if (uploadError) { setError(uploadError.message ?? "Erreur upload"); return; }
      onChange(publicUrl);
    } catch { setError("Erreur réseau"); }
    finally { setUploading(false); setProgress(0); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  // Image déjà uploadée → afficher + boutons modifier/supprimer
  if (value) {
    return (
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", minHeight: 160, backgroundColor: bg }}>
        <img src={value} alt="Couverture" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 160 }} />
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
          <button
            onClick={() => inputRef.current?.click()}
            style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Modifier l'image"
          >✏</button>
          <button
            onClick={() => onChange(null)}
            style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Supprimer"
          >✕</button>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {uploading && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <p style={{ color: "#fff", fontSize: 12, fontFamily: "system-ui", margin: 0 }}>Remplacement… {progress}%</p>
            <div style={{ width: 120, height: 4, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#fff", transition: "width 0.3s", borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        backgroundColor: bg, borderRadius: 12, border: `1px dashed ${dragOver ? "#B22222" : border}`,
        padding: 20, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 10, cursor: uploading ? "default" : "pointer", minHeight: 160,
        transition: "border-color 0.15s",
      }}
    >
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />

      {uploading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 12, color: textMuted, fontFamily: "system-ui", margin: 0 }}>Envoi… {progress}%</p>
          <div style={{ width: 100, height: 4, backgroundColor: dark ? "#1a1a1a" : "#e8e8e8", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#B22222", transition: "width 0.3s", borderRadius: 99 }} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: dark ? "#1a1a1a" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
          <p style={{ fontSize: 11, color: textMuted, margin: 0, textAlign: "center", fontFamily: "system-ui" }}>Glissez une image ici</p>
          <p style={{ fontSize: 10, color: textFaint, margin: 0, fontFamily: "system-ui" }}>ou</p>
          <button onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${border}`, backgroundColor: "transparent", color: textBtn, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>
            Importer une image
          </button>
          <p style={{ fontSize: 9, color: textFaint, margin: 0, textAlign: "center", fontFamily: "system-ui" }}>PNG, JPG, WEBP — max 20 Mo</p>
        </>
      )}
      {error && <p style={{ fontSize: 11, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
    </div>
  );
}
