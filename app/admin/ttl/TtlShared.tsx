"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";

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

type UploadBucket = "ttl-images" | "ttl-docs";

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
      const urlRes = await fetch("/api/admin/ttl/storage/signed-url", {
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

      const confirmRes = await fetch("/api/admin/ttl/storage/public-url", {
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

export function Modal({ children, onClose, maxWidth = 420 }: { children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

export function VideoCard({
  titre,
  coverUrl,
  onClick,
  onDelete,
}: {
  titre: string;
  coverUrl: string | null;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative", width: 140 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 140, height: 140, borderRadius: 10, border: "1px solid var(--admin-border)",
          backgroundColor: "var(--admin-card)", cursor: "pointer", padding: 0, overflow: "hidden",
          position: "relative", display: "block",
        }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎬</div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" }}>
          <span style={{ fontSize: 28, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>▶</span>
        </div>
      </button>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--admin-text)", fontWeight: 600, lineHeight: 1.3 }}>{titre}</p>
      <button type="button" onClick={onDelete} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, cursor: "pointer" }}>✕</button>
    </div>
  );
}

export function VideoPreviewModal({
  titre,
  lien_youtube,
  description,
  extra,
  onClose,
}: {
  titre: string;
  lien_youtube: string;
  description?: string | null;
  extra?: React.ReactNode;
  onClose: () => void;
}) {
  const embed = youtubeEmbedUrl(lien_youtube, { autoplay: true });
  return (
    <Modal onClose={onClose} maxWidth={560}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 15 }}>{titre}</p>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--admin-text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      {embed ? (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
          <iframe
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <a href={lien_youtube} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", fontSize: 13 }}>{lien_youtube}</a>
      )}
      {description && <p style={{ marginTop: 12, fontSize: 13, color: "var(--admin-text-muted)" }}>{description}</p>}
      {extra}
    </Modal>
  );
}
