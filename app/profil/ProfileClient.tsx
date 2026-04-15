"use client";

import { useState, useEffect } from "react";
import type { UserProfile, ProgrammeType, ProgrammeDuree } from "@/lib/user-profile";
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

// Durées par configuration programme
const PROGRAMME_CONFIG: Record<ProgrammeDuree, { days: number; weeks: number; label: string }> = {
  "16_semaines": { days: 112, weeks: 16, label: "16 semaines" },
  "6_mois":      { days: 183, weeks: 26, label: "6 mois" },
  "12_mois":     { days: 365, weeks: 52, label: "12 mois" },
};

function ProgrammeSelector({
  type,
  duree,
  onTypeChange,
  onDureeChange,
}: {
  type: ProgrammeType;
  duree: ProgrammeDuree;
  onTypeChange: (t: ProgrammeType) => void;
  onDureeChange: (d: ProgrammeDuree) => void;
}) {
  const pillBase: React.CSSProperties = {
    flex: 1,
    padding: "9px 0",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    border: "none",
    textAlign: "center",
    transition: "background 0.15s, color 0.15s",
  };
  const pillActive: React.CSSProperties = {
    ...pillBase,
    backgroundColor: "#B22222",
    color: "#FFFFFF",
  };
  const pillInactive: React.CSSProperties = {
    ...pillBase,
    backgroundColor: "#1a1a1a",
    color: "rgba(255,255,255,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div>
      {/* Toggle N1 / N2 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={type === "N1" ? pillActive : pillInactive} onClick={() => { onTypeChange("N1"); onDureeChange("16_semaines"); }}>
          N1
        </button>
        <button style={type === "N2" ? pillActive : pillInactive} onClick={() => onTypeChange("N2")}>
          N2
        </button>
      </div>

      {/* Sous-option durée si N2 */}
      {type === "N2" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={duree === "6_mois" ? pillActive : pillInactive}
            onClick={() => onDureeChange("6_mois")}
          >
            6 mois
          </button>
          <button
            style={duree === "12_mois" ? pillActive : pillInactive}
            onClick={() => onDureeChange("12_mois")}
          >
            12 mois
          </button>
        </div>
      )}
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
  const [programmeType, setProgrammeType] = useState<ProgrammeType>(initialProfile?.programme_type ?? "N1");
  const [programmeDuree, setProgrammeDuree] = useState<ProgrammeDuree>(initialProfile?.programme_duree ?? "16_semaines");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    // Vérifier l'état actuel de la subscription
    fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d) => {
        setPushEnabled(d.subscribed === true);
      })
      .catch(() => {})
      .finally(() => setPushLoading(false));
  }, []);

  async function handlePushToggle(checked: boolean) {
    setPushLoading(true);
    setPushMsg("");
    try {
      if (checked) {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          setPushMsg("Notifications non supportées sur ce navigateur");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushMsg("Permission refusée");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        if (res.ok) {
          setPushEnabled(true);
          setPushMsg("✓ Notifications activées");
        } else {
          setPushMsg("Erreur lors de l'activation");
        }
      } else {
        const res = await fetch("/api/push/subscribe", { method: "DELETE" });
        if (res.ok) {
          setPushEnabled(false);
          setPushMsg("Notifications désactivées");
          // Désabonner le service worker localement
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
          }
        } else {
          setPushMsg("Erreur lors de la désactivation");
        }
      }
    } catch {
      setPushMsg("Erreur inattendue");
    } finally {
      setPushLoading(false);
    }
  }

  function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr.buffer;
  }

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
        programme_type: programmeType,
        programme_duree: programmeType === "N1" ? "16_semaines" : programmeDuree,
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

  // Calcul de la progression temporelle selon le programme
  const effectiveDuree: ProgrammeDuree = programmeType === "N1" ? "16_semaines" : programmeDuree;
  const cfg = PROGRAMME_CONFIG[effectiveDuree];

  let semaineLabel = "";
  let timeProgress = 0;
  let dateFin = "";

  if (dateDemarrage) {
    const start = new Date(dateDemarrage);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const semaine = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), cfg.weeks);
    semaineLabel = `Semaine ${semaine} / ${cfg.weeks}`;
    timeProgress = Math.min(Math.max(diffDays / cfg.days, 0), 1) * 100;

    const end = new Date(start);
    end.setDate(end.getDate() + cfg.days);
    dateFin = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px 0" }}>

      {/* Toggle notifications push */}
      <div style={{
        backgroundColor: "#111111",
        border: "1px solid #1a1a1a",
        borderRadius: 18,
        padding: "16px 20px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <label
          htmlFor="push-toggle"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: pushLoading ? "default" : "pointer", flex: 1 }}
        >
          <input
            id="push-toggle"
            type="checkbox"
            checked={pushEnabled}
            disabled={pushLoading}
            onChange={(e) => handlePushToggle(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "#B22222", cursor: pushLoading ? "default" : "pointer", flexShrink: 0 }}
          />
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.03em" }}>
              🔔 Activer les notifications push
            </span>
            <p style={{ fontSize: 11, color: pushEnabled ? "#4ADE80" : "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
              {pushLoading ? "Vérification..." : pushEnabled ? "Activées" : "Désactivées"}
            </p>
          </div>
        </label>
        {pushMsg && (
          <span style={{ fontSize: 11, color: pushMsg.startsWith("✓") ? "#4ADE80" : "#F87171", flexShrink: 0 }}>
            {pushMsg}
          </span>
        )}
      </div>

      {/* Infos compte */}
      <Section title="MON COMPTE">
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>{email}</p>
        <Field label="PRÉNOM" value={prenom} onChange={setPrenom} placeholder="Ton prénom" />
        <Field label="NOM" value={nom} onChange={setNom} placeholder="Ton nom" />
        <Field label="DATE DE DÉMARRAGE" value={dateDemarrage} onChange={setDateDemarrage} type="date" />
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

      {/* Programme N1 / N2 */}
      <Section title="MON PROGRAMME">
        <ProgrammeSelector
          type={programmeType}
          duree={programmeDuree}
          onTypeChange={setProgrammeType}
          onDureeChange={setProgrammeDuree}
        />

        {dateDemarrage && (
          <div style={{ marginTop: 16 }}>
            {/* Barre de progression temporelle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{semaineLabel}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{Math.round(timeProgress)}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${timeProgress}%`,
                  backgroundColor: "#B22222",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {dateFin && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, letterSpacing: "0.03em" }}>
                Fin prévue : {dateFin}
              </p>
            )}
          </div>
        )}

        {!dateDemarrage && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 12, fontStyle: "italic" }}>
            Renseigne ta date de démarrage dans &quot;Mon compte&quot; pour voir ta progression.
          </p>
        )}
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
