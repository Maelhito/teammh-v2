"use client";

import { useEffect, useState } from "react";
import {
  QUESTIONNAIRE_GROUPS,
  ALL_FIELDS,
  countAnswered,
  TOTAL_QUESTIONS,
  type QuestionnaireField,
} from "@/lib/questionnaire-demarrage";

type Answers = Partial<Record<QuestionnaireField, string>>;

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#0D0D0D",
  border: "1px solid #262626",
  borderRadius: 10,
  padding: "11px 13px",
  color: "#F5F5F0",
  fontSize: "0.88rem",
  outline: "none",
  fontFamily: "inherit",
};

export default function QuestionnaireDemarrage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/questionnaire-demarrage");
        if (res.ok) {
          const d = await res.json();
          if (!cancelled && d.questionnaire) {
            const loaded: Answers = {};
            for (const f of ALL_FIELDS) {
              if (d.questionnaire[f]) loaded[f] = d.questionnaire[f];
            }
            setAnswers(loaded);
          }
        }
      } catch {
        if (!cancelled) setMsg({ type: "err", text: "Impossible de charger tes réponses précédentes." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function set(field: QuestionnaireField, value: string) {
    setAnswers((a) => ({ ...a, [field]: value }));
    setMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/questionnaire-demarrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, completed: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "ok", text: "✓ Tes réponses ont bien été enregistrées." });
      } else {
        setMsg({ type: "err", text: d.error ?? "Erreur : tes réponses n'ont pas été enregistrées." });
      }
    } catch {
      setMsg({ type: "err", text: "Erreur réseau : tes réponses n'ont pas été enregistrées, réessaie." });
    } finally {
      setSaving(false);
    }
  }

  const answered = countAnswered(answers as never);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
        Chargement du questionnaire…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Intro */}
      <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px 18px" }}>
        <p className="font-body" style={{ fontSize: "0.85rem", color: "#F5F5F0", margin: 0, lineHeight: 1.5 }}>
          Ce questionnaire permet de faire le point avant ton appel de démarrage.
        </p>
        <p className="font-body" style={{ fontSize: "0.78rem", color: "#6B7280", margin: "8px 0 0" }}>
          {answered}/{TOTAL_QUESTIONS} réponses complétées
        </p>
      </div>

      {QUESTIONNAIRE_GROUPS.map((group) => (
        <div key={group.title} style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 3, height: 15, backgroundColor: "#B45309", borderRadius: 2, flexShrink: 0 }} />
            <h2 className="font-body" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F5F0", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
              {group.title}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {group.questions.map((q) => (
              <div key={q.field}>
                <label className="font-body" style={{ display: "block", fontSize: "0.78rem", color: "#9CA3AF", marginBottom: 6, lineHeight: 1.4 }}>
                  {q.label}
                </label>

                {q.kind === "ouinon" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Oui", "Non"].map((opt) => {
                      const active = (answers[q.field] ?? "").toLowerCase() === opt.toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set(q.field, opt)}
                          style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            border: `1px solid ${active ? "#B45309" : "#262626"}`,
                            backgroundColor: active ? "rgba(180,83,9,0.15)" : "#0D0D0D",
                            color: active ? "#F59E0B" : "#6B7280",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : q.kind === "textarea" ? (
                  <textarea
                    value={answers[q.field] ?? ""}
                    onChange={(e) => set(q.field, e.target.value)}
                    placeholder={q.placeholder}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[q.field] ?? ""}
                    onChange={(e) => set(q.field, e.target.value)}
                    placeholder={q.placeholder}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {msg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: msg.type === "ok" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${msg.type === "ok" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
            color: msg.type === "ok" ? "#4ADE80" : "#F87171",
            fontSize: "0.82rem",
          }}
        >
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "15px 0",
          borderRadius: 12,
          border: "none",
          backgroundColor: saving ? "#6B7280" : "#B45309",
          color: "#FFFFFF",
          fontSize: "0.92rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer mes réponses"}
      </button>
    </div>
  );
}
