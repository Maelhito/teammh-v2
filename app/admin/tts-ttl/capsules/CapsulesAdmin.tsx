"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader, FileUploadButton, VideoCard, VideoPreviewModal } from "../TtsShared";

interface Capsule {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  duree_minutes: number | null;
  cover_url: string | null;
  ordre: number;
}

export default function CapsulesAdmin() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewCapsule, setPreviewCapsule] = useState<Capsule | null>(null);

  const [titre, setTitre] = useState("");
  const [lien, setLien] = useState("");
  const [description, setDescription] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState("");
  const [cover, setCover] = useState<{ url: string; name: string } | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/tts-ttl/capsules")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Erreur de chargement");
        setCapsules(d.capsules ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim() || !lien.trim()) {
      setError("Titre et lien YouTube requis");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tts-ttl/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre,
          lien_youtube: lien,
          description: description || null,
          duree_minutes: dureeMinutes ? Number(dureeMinutes) : null,
          cover_url: cover?.url ?? null,
          ordre: capsules.length,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setCapsules((prev) => [...prev, d.capsule]);
      setTitre(""); setLien(""); setDescription(""); setDureeMinutes(""); setCover(null);
      setFormVersion((v) => v + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/admin/tts-ttl/capsules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setCapsules((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <PageHeader title="Capsules motivation" subtitle="Contenu court (5-10 min), libre, affiché dans la bibliothèque et sur l'accueil" />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <form key={formVersion} onSubmit={handleAdd} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input type="text" placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)} style={inputStyle} />
          <input type="url" placeholder="Lien YouTube" value={lien} onChange={(e) => setLien(e.target.value)} style={inputStyle} />
        </div>
        <textarea placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input type="number" placeholder="Durée (min)" value={dureeMinutes} onChange={(e) => setDureeMinutes(e.target.value)} style={inputStyle} />
          <FileUploadButton
            bucket="tts-images"
            accept="image/*"
            label="🖼 Image de couverture (optionnel)"
            value={cover}
            onUploaded={setCover}
          />
        </div>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "..." : "+ Capsule"}</button>
      </form>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {capsules.map((c) => (
            <VideoCard
              key={c.id}
              titre={c.titre}
              coverUrl={c.cover_url}
              onClick={() => setPreviewCapsule(c)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
          {capsules.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucune capsule pour l&apos;instant.</p>}
        </div>
      )}

      {previewCapsule && (
        <VideoPreviewModal
          titre={previewCapsule.titre}
          lien_youtube={previewCapsule.lien_youtube}
          description={previewCapsule.description}
          onClose={() => setPreviewCapsule(null)}
        />
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px", backgroundColor: "#B22222", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start",
};
