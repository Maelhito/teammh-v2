"use client";

import { useRef, useState } from "react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  dark?: boolean;
}

export default function ImageUpload({ value, onChange, dark = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const bg = dark ? "#111" : "#fafafa";
  const border = dark ? "#2a2a2a" : "#e0e0e0";
  const textMuted = dark ? "#555" : "#aaa";
  const textFaint = dark ? "#333" : "#ccc";
  const textBtn = dark ? "#666" : "#888";

  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) { setError("Max 20 Mo"); return; }
    setError(null); setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/coach/upload-image", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur upload"); return; }
      onChange(d.url);
    } catch { setError("Erreur réseau"); }
    finally { setUploading(false); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  if (value) {
    return (
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", minHeight: 160, backgroundColor: bg }}>
        <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 160 }} />
        <button
          onClick={() => onChange(null)}
          style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
          title="Supprimer"
        >✕</button>
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
        justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 160,
        transition: "border-color 0.15s",
      }}
    >
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />

      {uploading ? (
        <p style={{ fontSize: 12, color: textMuted, fontFamily: "system-ui", margin: 0 }}>Envoi en cours…</p>
      ) : (
        <>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: dark ? "#1a1a1a" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
          <p style={{ fontSize: 11, color: textMuted, margin: 0, textAlign: "center", fontFamily: "system-ui" }}>Glissez une image ici</p>
          <p style={{ fontSize: 10, color: textFaint, margin: 0, fontFamily: "system-ui" }}>ou</p>
          <button
            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${border}`, backgroundColor: "transparent", color: textBtn, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}
          >
            Importer une image
          </button>
          <p style={{ fontSize: 9, color: textFaint, margin: 0, textAlign: "center", fontFamily: "system-ui" }}>PNG, JPG, WEBP — max 20 Mo</p>
        </>
      )}
      {error && <p style={{ fontSize: 11, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
    </div>
  );
}
