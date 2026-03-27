"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/user-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Props {
  initialProfile: UserProfile | null;
  email: string;
  completedCount: number;
  totalModules: number;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          backgroundColor: "#0D0D0D",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "10px 12px",
          color: "#FFFFFF",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 18, padding: "20px 20px 24px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <span style={{ width: 3, height: 16, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0, color: "#F5F5F0" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfileClient({ initialProfile, email, completedCount, totalModules }: Props) {
  const [prenom, setPrenom] = useState(initialProfile?.prenom ?? "");
  const [nom, setNom] = useState(initialProfile?.nom ?? "");
  const [dateDemarrage, setDateDemarrage] = useState(initialProfile?.date_demarrage ?? "");
  const [obj4Poids, setObj4Poids] = useState(initialProfile?.objectif_4mois_poids ?? "");
  const [obj4Bienetre, setObj4Bienetre] = useState(initialProfile?.objectif_4mois_bienetre ?? "");
  const [obj12Poids, setObj12Poids] = useState(initialProfile?.objectif_12mois_poids ?? "");
  const [obj12Bienetre, setObj12Bienetre] = useState(initialProfile?.objectif_12mois_bienetre ?? "");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom,
        nom,
        date_demarrage: dateDemarrage || null,
        objectif_4mois_poids: obj4Poids,
        objectif_4mois_bienetre: obj4Bienetre,
        objectif_12mois_poids: obj12Poids,
        objectif_12mois_bienetre: obj12Bienetre,
      }),
    });
    setSaving(false);
    setMsg(res.ok ? "✓ Profil sauvegardé" : "Erreur lors de la sauvegarde");
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Calcul semaine courante
  let semaineLabel = "";
  if (dateDemarrage) {
    const start = new Date(dateDemarrage);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const semaine = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 16);
    semaineLabel = `Semaine ${semaine} / 16`;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px 0" }}>

      {/* Infos compte */}
      <Section title="MON COMPTE">
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>{email}</p>
        <Field label="PRÉNOM" value={prenom} onChange={setPrenom} placeholder="Ton prénom" />
        <Field label="NOM" value={nom} onChange={setNom} placeholder="Ton nom" />
        <Field label="DATE DE DÉMARRAGE" value={dateDemarrage} onChange={setDateDemarrage} type="date" />
        {semaineLabel && (
          <p style={{ fontSize: 12, color: "#B22222", fontWeight: 700, letterSpacing: "0.04em", marginTop: -8 }}>
            {semaineLabel}
          </p>
        )}
      </Section>

      {/* Progression modules */}
      <Section title="MA PROGRESSION">
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Modules complétés</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F5F5F0" }}>{completedCount} / {totalModules}</span>
          </div>
          <div style={{ height: 6, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${totalModules > 0 ? (completedCount / totalModules) * 100 : 0}%`,
                backgroundColor: "#B22222",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </Section>

      {/* Objectifs 4 mois */}
      <Section title="OBJECTIFS 4 MOIS">
        <Field label="OBJECTIF POIDS" value={obj4Poids} onChange={setObj4Poids} placeholder="ex: Perdre 5 kg" />
        <Field label="OBJECTIF BIEN-ÊTRE" value={obj4Bienetre} onChange={setObj4Bienetre} placeholder="ex: Me sentir plus légère" />
      </Section>

      {/* Objectifs 12 mois */}
      <Section title="OBJECTIFS 12 MOIS">
        <Field label="OBJECTIF POIDS" value={obj12Poids} onChange={setObj12Poids} placeholder="ex: Atteindre mon poids de forme" />
        <Field label="OBJECTIF BIEN-ÊTRE" value={obj12Bienetre} onChange={setObj12Bienetre} placeholder="ex: Une relation saine avec la nourriture" />
      </Section>

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%",
          backgroundColor: saving ? "#8B1515" : "#B22222",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 12,
          padding: "14px 0",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: saving ? "not-allowed" : "pointer",
          marginBottom: 12,
        }}
      >
        {saving ? "Sauvegarde..." : "SAUVEGARDER"}
      </button>

      {msg && (
        <p style={{ fontSize: 12, textAlign: "center", marginBottom: 12, color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>
          {msg}
        </p>
      )}

      {/* Déconnexion */}
      <button
        onClick={handleSignOut}
        style={{
          width: "100%",
          backgroundColor: "transparent",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "12px 0",
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          marginBottom: 24,
          letterSpacing: "0.04em",
        }}
      >
        Se déconnecter
      </button>

    </div>
  );
}
