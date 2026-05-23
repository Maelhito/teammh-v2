"use client";

import { useState } from "react";

interface Props {
  prenom: string;
  nom: string;
  email: string;
  role: string;
  specialite: string;
  bio: string;
  telephone: string;
  lien_zoom: string;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 9,
  border: "1px solid #e8e8e8", backgroundColor: "#fff",
  fontSize: 14, color: "#1a1a1a", fontFamily: "system-ui",
  outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#aaa",
  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5,
  fontFamily: "system-ui",
};

export default function ProfilCoachClient({ prenom: initPrenom, nom: initNom, email, role, specialite: initSpecialite, bio: initBio, telephone: initTel, lien_zoom: initLienZoom }: Props) {
  const [prenom, setPrenom] = useState(initPrenom);
  const [nom, setNom] = useState(initNom);
  const [specialite, setSpecialite] = useState(initSpecialite);
  const [bio, setBio] = useState(initBio);
  const [telephone, setTelephone] = useState(initTel);
  const [lienZoom, setLienZoom] = useState(initLienZoom);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "?";

  async function handleSave() {
    setError(null); setSuccess(false); setSaving(true);
    try {
      const res = await fetch("/api/coach/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: prenom.trim(), nom: nom.trim(), specialite: specialite.trim(), bio: bio.trim(), telephone: telephone.trim(), lien_zoom: lienZoom.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError("Erreur réseau"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {/* Avatar + titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#B22222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "system-ui", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {prenom || initPrenom} {nom || initNom}
          </h1>
          <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0", fontFamily: "system-ui" }}>{email}</p>
        </div>
      </div>

      {/* Infos non modifiables */}
      <div style={{ backgroundColor: "#fafafa", borderRadius: 12, border: "1px solid #f0f0f0", padding: "14px 16px", marginBottom: 20, display: "flex", gap: 24 }}>
        <div>
          <p style={{ ...lbl, marginBottom: 2 }}>Email</p>
          <p style={{ fontSize: 14, color: "#555", margin: 0, fontFamily: "system-ui" }}>{email}</p>
        </div>
        <div>
          <p style={{ ...lbl, marginBottom: 2 }}>Rôle</p>
          <p style={{ fontSize: 14, color: "#555", margin: 0, fontFamily: "system-ui", textTransform: "capitalize" }}>{role}</p>
        </div>
      </div>

      {/* Formulaire */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div className="coach-name-grid">
          <div>
            <label style={lbl}>Prénom</label>
            <input style={inp} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Ton prénom" />
          </div>
          <div>
            <label style={lbl}>Nom</label>
            <input style={inp} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ton nom" />
          </div>
        </div>

        <div>
          <label style={lbl}>Téléphone</label>
          <input style={inp} type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+33 6 00 00 00 00" />
        </div>

        <div>
          <label style={lbl}>🎥 Lien Zoom personnel</label>
          <input
            style={inp} type="url" value={lienZoom}
            onChange={e => setLienZoom(e.target.value)}
            placeholder="https://zoom.us/j/..."
          />
          <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0", fontFamily: "system-ui" }}>
            Ce lien sera ajouté automatiquement à chaque rendez-vous que tu crées avec tes clientes.
          </p>
        </div>

        <div>
          <label style={lbl}>Spécialité</label>
          <input style={inp} value={specialite} onChange={e => setSpecialite(e.target.value)} placeholder="Ex : Coach sportif, Préparation physique…" />
        </div>

        <div>
          <label style={lbl}>Bio / Présentation</label>
          <textarea
            style={{ ...inp, minHeight: 100, resize: "vertical" } as React.CSSProperties}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Quelques mots sur toi, ton approche, tes valeurs…"
          />
        </div>

        {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>✗ {error}</p>}
        {success && <p style={{ fontSize: 12, color: "#22C55E", margin: 0, fontFamily: "system-ui" }}>✓ Profil mis à jour</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "12px", borderRadius: 10, border: "none", backgroundColor: saving ? "#e8e8e8" : "#B22222", color: saving ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui", letterSpacing: "0.04em" }}
        >
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}
