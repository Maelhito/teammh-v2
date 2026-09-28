"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TtlCelebration from "@/components/TtlCelebration";
import { ttlColors } from "@/lib/ttl-theme";
import {
  TTL_QUESTIONNAIRE_GROUPS,
  TTL_QUESTIONNAIRE_TOTAL,
  compterReponses,
  type TtlReponses,
} from "@/lib/ttl-questionnaire";

interface Props {
  initialReponses: TtlReponses | null;
  initialComplet: boolean;
  /** prénom du compte, pour pré-remplir la première question */
  prenom: string;
  /** vrai si les vidéos du module sont déjà vues : valider le questionnaire termine le module */
  videosVues: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: ttlColors.bg,
  border: `1px solid ${ttlColors.cardBorder}`,
  borderRadius: 10,
  padding: "11px 13px",
  color: ttlColors.offWhite,
  fontSize: 16, // 16px minimum : sous Safari iOS, en dessous la page zoome au focus
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    border: `1px solid ${active ? ttlColors.redBright : ttlColors.cardBorder}`,
    backgroundColor: active ? "rgba(230,57,70,0.15)" : ttlColors.bg,
    color: active ? "#fff" : ttlColors.muted,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export default function TtlQuestionnaire({ initialReponses, initialComplet, prenom, videosVues }: Props) {
  const router = useRouter();
  const [reponses, setReponses] = useState<TtlReponses>(() => ({
    ...(prenom ? { prenom } : {}),
    ...(initialReponses ?? {}),
  }));
  const [complet, setComplet] = useState(initialComplet);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  const answered = compterReponses(reponses);
  const manquantes = TTL_QUESTIONNAIRE_TOTAL - answered;

  function set(field: string, value: string) {
    setReponses((r) => ({ ...r, [field]: value }));
    setMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ttl/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponses }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "err", text: d.error ?? "Erreur : tes réponses n'ont pas été enregistrées, réessaie." });
        return;
      }
      if (d.complet) {
        if (!complet) setCelebration(videosVues ? "Module terminé !" : "Questionnaire validé !");
        setMsg({ type: "ok", text: "✓ C'est enregistré. Tu retrouves tes réponses dans ton profil." });
      } else {
        setMsg({
          type: "ok",
          text: `Réponses enregistrées. Il te manque encore ${manquantes} réponse${manquantes > 1 ? "s" : ""} pour valider ce devoir.`,
        });
      }
      setComplet(!!d.complet);
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : tes réponses n'ont pas été enregistrées, réessaie." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: ttlColors.card, border: `1px solid ${complet ? "rgba(74,222,128,0.35)" : "rgba(230,57,70,0.35)"}`, borderRadius: 16, padding: "16px 18px" }}>
        <p className="font-body" style={{ color: ttlColors.redBright, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 4px" }}>
          TON PREMIER DEVOIR
        </p>
        <p className="font-body" style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
          Ton questionnaire de départ
        </p>
        <p className="font-body" style={{ fontSize: 12.5, color: ttlColors.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
          Quelques questions pour faire le point sur où tu en es aujourd&apos;hui. Tu retrouveras tes réponses dans ton profil pour mesurer ton chemin.
        </p>
        <p className="font-body" style={{ fontSize: 12, color: complet ? ttlColors.green : ttlColors.muted, margin: "10px 0 0", fontWeight: 600 }}>
          {complet ? "✓ Devoir validé" : `${answered}/${TTL_QUESTIONNAIRE_TOTAL} réponses`}
        </p>
      </div>

      {TTL_QUESTIONNAIRE_GROUPS.map((group) => (
        <div key={group.title} style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 3, height: 15, backgroundColor: ttlColors.red, borderRadius: 2, flexShrink: 0 }} />
            <h2 className="font-body" style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
              {group.title}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {group.questions.map((q) => (
              <div key={q.field}>
                <label className="font-body" style={{ display: "block", fontSize: 13, color: "#cfc8c0", marginBottom: 7, lineHeight: 1.4 }}>
                  {q.label}
                </label>

                {q.kind === "note10" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set(q.field, n)}
                        style={{ ...chipStyle(reponses[q.field] === n), height: 38, fontSize: 14 }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : q.kind === "choix" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(q.options ?? []).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set(q.field, opt)}
                        style={{ ...chipStyle(reponses[q.field] === opt), padding: "9px 14px", fontSize: 13.5 }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.kind === "textarea" ? (
                  <textarea
                    value={reponses[q.field] ?? ""}
                    onChange={(e) => set(q.field, e.target.value)}
                    placeholder={q.placeholder}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      inputMode={q.kind === "nombre" ? "decimal" : "text"}
                      value={reponses[q.field] ?? ""}
                      onChange={(e) => set(q.field, e.target.value)}
                      placeholder={q.placeholder}
                      style={{ ...inputStyle, paddingRight: q.unite ? 48 : 13 }}
                    />
                    {q.unite && (
                      <span className="font-body" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: ttlColors.muted, fontSize: 13, pointerEvents: "none" }}>
                        {q.unite}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {msg && (
        <div
          className="font-body"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: msg.type === "ok" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${msg.type === "ok" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
            color: msg.type === "ok" ? ttlColors.green : "#F87171",
            fontSize: 13,
          }}
        >
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="font-body"
        style={{
          padding: "15px 0",
          borderRadius: 12,
          border: "none",
          backgroundColor: saving ? ttlColors.muted : ttlColors.red,
          color: "#FFFFFF",
          fontSize: 14.5,
          fontWeight: 700,
          letterSpacing: "0.03em",
          cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          marginBottom: 16,
        }}
      >
        {saving ? "Enregistrement…" : complet ? "Mettre à jour mes réponses" : "Valider mon questionnaire"}
      </button>

      {celebration && (
        <TtlCelebration message={celebration} emoji={celebration.includes("Module") ? "🎓" : "✅"} onDone={() => setCelebration(null)} />
      )}
    </div>
  );
}
