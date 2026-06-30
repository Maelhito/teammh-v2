"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--admin-input-bg)",
  border: "1px solid var(--admin-border)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--admin-text)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--admin-card2)",
  border: "1px solid var(--admin-border)",
  borderRadius: 14,
  padding: 20,
};

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--admin-text)", margin: "0 0 4px", fontFamily: "system-ui" }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: "var(--admin-text-muted)", margin: 0, fontFamily: "system-ui" }}>{subtitle}</p>
      )}
    </div>
  );
}

type UploadBucket = "tts-images" | "tts-docs";

export function FileUploadButton({
  bucket,
  accept,
  label,
  value,
  onUploaded,
}: {
  bucket: UploadBucket;
  accept: string;
  label: string;
  value: { url: string; name: string } | null;
  onUploaded: (result: { url: string; name: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const urlRes = await fetch("/api/admin/tts/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, filename: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) { setError(urlData.error ?? "Erreur"); return; }

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(urlData.storagePath, urlData.token, file, { contentType: file.type || undefined });
      if (uploadError) { setError(uploadError.message); return; }

      const confirmRes = await fetch("/api/admin/tts/storage/public-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, storagePath: urlData.storagePath }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) { setError(confirmData.error ?? "Erreur"); return; }

      onUploaded({ url: confirmData.url, name: file.name });
    } catch {
      setError("Erreur réseau");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={value.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3B82F6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
            {value.name}
          </a>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 11, cursor: uploading ? "not-allowed" : "pointer" }}>
            {uploading ? "..." : "Remplacer"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...inputStyle, cursor: uploading ? "not-allowed" : "pointer", textAlign: "left", color: "var(--admin-text-muted)" }}>
          {uploading ? "Upload en cours…" : label}
        </button>
      )}
      <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
      {error && <p style={{ fontSize: 11, color: "#F87171", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}
