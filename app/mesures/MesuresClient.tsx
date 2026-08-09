"use client";

import { useEffect, useState } from "react";
import {
  CHAMPS, INTERVALLE_JOURS, couleurEcart, ecarts, formatEcart, prochaineMesure, trierParDate,
  type Mesure, type MesureChamp,
} from "@/lib/mesures";
import MesureChart from "./MesureChart";
import PhotosSection from "./PhotosSection";

type Onglet = "mesures" | "photos";

const carte: React.CSSProperties = {
  backgroundColor: "#111111",
  border: "1px solid #1a1a1a",
  borderRadius: 16,
  padding: "16px 18px",
};

function labelDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MesuresClient() {
  const [onglet, setOnglet] = useState<Onglet>("mesures");
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);

  async function charger() {
    try {
      const res = await fetch("/api/mesures");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMesures(d.mesures ?? []);
      else setMsg({ type: "err", text: d.error ?? "Impossible de charger tes mesures." });
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : mesures non chargées." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function enregistrer() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/mesures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "ok", text: "✓ Mesures enregistrées." });
        setForm({});
        setFormOuvert(false);
        await charger();
      } else {
        setMsg({ type: "err", text: d.error ?? "Tes mesures n'ont pas été enregistrées." });
      }
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : rien n'a été enregistré, réessaie." });
    } finally {
      setSaving(false);
    }
  }

  const prochaine = prochaineMesure(mesures);
  const historique = trierParDate(mesures).slice().reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
      {/* Onglets */}
      <div style={{ display: "flex", gap: 8 }}>
        {([["mesures", "Mesures"], ["photos", "Photos"]] as [Onglet, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setOnglet(id)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${onglet === id ? "#B22222" : "#262626"}`,
              backgroundColor: onglet === id ? "rgba(178,34,34,0.15)" : "#111111",
              color: onglet === id ? "#F5F5F0" : "#6B7280",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {onglet === "photos" ? (
        <PhotosSection />
      ) : loading ? (
        <div style={{ ...carte, textAlign: "center", color: "#6B7280", fontSize: "0.8rem" }}>Chargement…</div>
      ) : (
        <>
          {/* Prochaine mesure */}
          <div style={{ ...carte, background: "linear-gradient(135deg, #7C2D12 0%, #B45309 100%)", border: "none" }}>
            {!prochaine ? (
              <>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                  PREMIÈRE MESURE
                </p>
                <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFF", margin: "3px 0 0" }}>
                  Prends ton point de départ
                </p>
                <p className="font-body" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "3px 0 0" }}>
                  C&apos;est la référence de toute ta progression.
                </p>
              </>
            ) : (
              <>
                <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", margin: 0 }}>
                  PROCHAINE MESURE
                </p>
                <p className="font-body" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFF", margin: "3px 0 0" }}>
                  {prochaine.joursRestants > 0
                    ? `Dans ${prochaine.joursRestants} jour${prochaine.joursRestants > 1 ? "s" : ""}`
                    : "C'est le moment !"}
                </p>
                <p className="font-body" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "3px 0 0" }}>
                  Toutes les {INTERVALLE_JOURS} jours · le matin à jeun, dans les mêmes conditions.
                </p>
              </>
            )}
          </div>

          {/* Bouton nouvelle mesure */}
          {!formOuvert && (
            <button
              onClick={() => { setFormOuvert(true); setMsg(null); }}
              style={{
                padding: "14px 0", borderRadius: 12, border: "none", backgroundColor: "#B22222",
                color: "#FFF", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "0.03em",
              }}
            >
              + Saisir mes mesures
            </button>
          )}

          {/* Formulaire */}
          {formOuvert && (
            <div style={carte}>
              <p className="font-body" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 4px" }}>
                Mes mesures du jour
              </p>
              <p className="font-body" style={{ fontSize: "0.72rem", color: "#6B7280", margin: "0 0 14px" }}>
                Remplis ce que tu peux — rien n&apos;est obligatoire.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {CHAMPS.map(({ champ, label, unite, placeholder }) => (
                  <div key={champ} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ flex: 1, fontSize: "0.8rem", color: "#9CA3AF" }}>{label}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form[champ] ?? ""}
                      onChange={(e) => { setForm((f) => ({ ...f, [champ]: e.target.value })); setMsg(null); }}
                      placeholder={placeholder}
                      style={{
                        width: 90, backgroundColor: "#0D0D0D", border: "1px solid #262626",
                        borderRadius: 9, padding: "9px 11px", color: "#F5F5F0", fontSize: "0.85rem",
                        outline: "none", textAlign: "right", fontFamily: "inherit",
                      }}
                    />
                    <span style={{ width: 22, fontSize: "0.75rem", color: "#6B7280" }}>{unite}</span>
                  </div>
                ))}
              </div>

              {msg && (
                <p style={{ fontSize: "0.75rem", margin: "12px 0 0", color: msg.type === "ok" ? "#4ADE80" : "#F87171" }}>
                  {msg.text}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => { setFormOuvert(false); setForm({}); setMsg(null); }}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid #262626", backgroundColor: "#0D0D0D", color: "#9CA3AF", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Annuler
                </button>
                <button
                  onClick={enregistrer}
                  disabled={saving}
                  style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: saving ? "#6B7280" : "#B22222", color: "#FFF", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          )}

          {msg && !formOuvert && (
            <p style={{ fontSize: "0.75rem", margin: 0, color: msg.type === "ok" ? "#4ADE80" : "#F87171" }}>{msg.text}</p>
          )}

          {/* Indicateurs clés */}
          {mesures.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {CHAMPS.filter((c) => c.cle).map(({ champ, label, unite }) => {
                const e = ecarts(mesures, champ);
                return (
                  <div key={champ} style={carte}>
                    <p style={{ fontSize: "0.68rem", color: "#6B7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                      {label}
                    </p>
                    <p className="font-title" style={{ fontSize: "1.5rem", color: "#F5F5F0", margin: "6px 0 0", lineHeight: 1 }}>
                      {e.actuel ?? "—"}
                      <span style={{ fontSize: "0.8rem", color: "#6B7280", marginLeft: 4 }}>{e.actuel != null ? unite : ""}</span>
                    </p>
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: "0.68rem", color: couleurEcart(e.vsPrecedent) }}>
                        {formatEcart(e.vsPrecedent, unite)} <span style={{ color: "#4B5563" }}>vs précédent</span>
                      </span>
                      <span style={{ fontSize: "0.68rem", color: couleurEcart(e.vsDepart) }}>
                        {formatEcart(e.vsDepart, unite)} <span style={{ color: "#4B5563" }}>depuis le départ</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Courbes */}
          {mesures.length >= 2 && CHAMPS.filter((c) => c.cle).map(({ champ, label, unite }) => (
            <div key={champ} style={carte}>
              <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 10px" }}>
                Évolution · {label}
              </p>
              <MesureChart mesures={mesures} champ={champ as MesureChamp} unite={unite} />
            </div>
          ))}

          {/* Historique */}
          {historique.length > 0 && (
            <div style={carte}>
              <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 12px" }}>
                Historique <span style={{ color: "#6B7280", fontWeight: 400 }}>({historique.length})</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {historique.map((m) => (
                  <div key={m.id} style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 10 }}>
                    <p style={{ fontSize: "0.74rem", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 700 }}>
                      {labelDate(m.date)}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                      {CHAMPS.filter(({ champ }) => m[champ] != null).map(({ champ, label, unite }) => (
                        <span key={champ} style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                          {label} <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{String(m[champ])}</span> {unite}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
