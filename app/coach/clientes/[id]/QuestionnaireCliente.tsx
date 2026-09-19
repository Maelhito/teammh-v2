"use client";

import { useEffect, useState } from "react";
import {
  QUESTIONNAIRE_GROUPS,
  ALL_FIELDS,
  countAnswered,
  TOTAL_QUESTIONS,
  type QuestionnaireDemarrage,
  type QuestionnaireField,
} from "@/lib/questionnaire-demarrage";

type Answers = Partial<Record<QuestionnaireField, string>>;

/**
 * Questionnaire de démarrage de la cliente — lecture pour le coach,
 * modifiable par les admins (Mael, Julie) via le bouton "Modifier".
 * Affiché au-dessus du calendrier sur la fiche cliente.
 */
export default function QuestionnaireCliente({ clienteId }: { clienteId: string }) {
  const [data, setData] = useState<QuestionnaireDemarrage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/coach/clientes/${clienteId}/questionnaire`);
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setData(d.questionnaire ?? null);
        else setError(d.error ?? "Erreur de chargement");
      } catch {
        if (!cancelled) setError("Impossible de charger le questionnaire");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/coach/droits");
        const d = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setEstAdmin(!!d.estAdmin);
      } catch {
        // silencieux : pas de bouton Modifier si on ne sait pas
      }
    })();
    return () => { cancelled = true; };
  }, [clienteId]);

  const answered = countAnswered(data);
  // Tous les groupes sauf les objectifs (affichés à part ci-dessous)
  const autresGroupes = QUESTIONNAIRE_GROUPS.filter(
    (g) => g.title !== "Tes objectifs sur les 4 prochains mois" && g.title !== "Tes objectifs sur 12 mois"
  );
  const [objectifs4, objectifs12] = QUESTIONNAIRE_GROUPS;

  function startEdit() {
    const d: Answers = {};
    for (const f of ALL_FIELDS) {
      const v = data?.[f];
      if (typeof v === "string") d[f] = v;
    }
    setDraft(d);
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  function setField(field: QuestionnaireField, value: string) {
    setDraft((a) => ({ ...a, [field]: value }));
  }

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/coach/clientes/${clienteId}/questionnaire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData((prev) => ({ ...(prev ?? ({} as QuestionnaireDemarrage)), ...draft }));
        setEditing(false);
      } else {
        setSaveError(d.error ?? "Erreur : les modifications n'ont pas été enregistrées.");
      }
    } catch {
      setSaveError("Erreur réseau : réessaie.");
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 14,
    border: "1px solid #efefef",
    padding: "16px 18px",
    marginBottom: 12,
  };
  const lbl: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "#aaa",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    margin: "0 0 8px",
    fontFamily: "system-ui",
  };
  const btn: React.CSSProperties = {
    padding: "5px 11px",
    borderRadius: 7,
    border: "1px solid #e8e8e8",
    backgroundColor: "#fafafa",
    color: "#888",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "system-ui",
    flexShrink: 0,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#1a1a1a",
    fontSize: 13,
    outline: "none",
    fontFamily: "system-ui",
  };

  function Answer({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "#bbb", margin: "0 0 3px", fontFamily: "system-ui", lineHeight: 1.3 }}>{label}</p>
        <p
          style={{
            fontSize: 13,
            color: value ? "#1a1a1a" : "#ccc",
            fontWeight: value ? 600 : 400,
            margin: 0,
            fontFamily: "system-ui",
            lineHeight: 1.45,
            fontStyle: value ? "normal" : "italic",
            whiteSpace: "pre-wrap",
          }}
        >
          {value || "—"}
        </p>
      </div>
    );
  }

  function EditField({ field, label, kind, placeholder }: { field: QuestionnaireField; label: string; kind: string; placeholder?: string }) {
    return (
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "#bbb", margin: "0 0 4px", fontFamily: "system-ui", lineHeight: 1.3 }}>{label}</p>
        {kind === "note10" ? (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => {
              const active = draft[field] === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setField(field, n)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    border: `1px solid ${active ? "#B45309" : "#e0e0e0"}`,
                    backgroundColor: active ? "rgba(180,83,9,0.12)" : "#fff",
                    color: active ? "#B45309" : "#888",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "system-ui",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        ) : kind === "ouinon" ? (
          <div style={{ display: "flex", gap: 6 }}>
            {["Oui", "Non"].map((opt) => {
              const active = (draft[field] ?? "").toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setField(field, opt)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 7,
                    border: `1px solid ${active ? "#B45309" : "#e0e0e0"}`,
                    backgroundColor: active ? "rgba(180,83,9,0.12)" : "#fff",
                    color: active ? "#B45309" : "#888",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "system-ui",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : kind === "textarea" ? (
          <textarea
            value={draft[field] ?? ""}
            onChange={(e) => setField(field, e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        ) : (
          <input
            type="text"
            value={draft[field] ?? ""}
            onChange={(e) => setField(field, e.target.value)}
            placeholder={placeholder}
            style={inputStyle}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={card}>
        <p style={lbl}>Questionnaire de démarrage</p>
        <p style={{ fontSize: 12, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={card}>
        <p style={lbl}>Questionnaire de démarrage</p>
        <p style={{ fontSize: 12, color: "#F87171", margin: 0, fontFamily: "system-ui" }}>⚠ {error}</p>
      </div>
    );
  }

  if (!data && !editing) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ ...lbl, margin: 0 }}>Questionnaire de démarrage</p>
          {estAdmin && (
            <button onClick={startEdit} style={btn}>Modifier</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#bbb", margin: "8px 0 0", fontFamily: "system-ui" }}>
          Pas encore rempli par la cliente.
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <p style={{ ...lbl, margin: 0 }}>Questionnaire de démarrage — modification</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={cancelEdit} disabled={saving} style={btn}>Annuler</button>
            <button
              onClick={saveEdit}
              disabled={saving}
              style={{ ...btn, backgroundColor: "#B45309", borderColor: "#B45309", color: "#fff" }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        {saveError && (
          <p style={{ fontSize: 12, color: "#F87171", margin: "0 0 12px", fontFamily: "system-ui" }}>⚠ {saveError}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {QUESTIONNAIRE_GROUPS.map((groupe) => (
            <div key={groupe.title}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
                {groupe.title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupe.questions.map((q) => (
                  <EditField key={q.field} field={q.field} label={q.label} kind={q.kind} placeholder={q.placeholder} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <p style={{ ...lbl, margin: 0 }}>
          Questionnaire de démarrage
          <span style={{ marginLeft: 8, color: answered === TOTAL_QUESTIONS ? "#10B981" : "#F59E0B", letterSpacing: 0 }}>
            {answered}/{TOTAL_QUESTIONS}
          </span>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {estAdmin && (
            <button onClick={startEdit} style={btn}>Modifier</button>
          )}
          <button onClick={() => setShowAll((s) => !s)} style={btn}>
            {showAll ? "Réduire" : "Voir tout"}
          </button>
        </div>
      </div>

      {/* Objectifs — toujours visibles */}
      <div className="coach-cliente-2col">
        <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
            {objectifs4.title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {objectifs4.questions.map((q) => (
              <Answer key={q.field} label={q.label} value={data?.[q.field]} />
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
            {objectifs12.title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {objectifs12.questions.map((q) => (
              <Answer key={q.field} label={q.label} value={data?.[q.field]} />
            ))}
          </div>
        </div>
      </div>

      {/* Reste du questionnaire */}
      {showAll && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f5f5f5", display: "flex", flexDirection: "column", gap: 16 }}>
          {autresGroupes.map((groupe) => (
            <div key={groupe.title}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
                {groupe.title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupe.questions.map((q) => (
                  <Answer key={q.field} label={q.label} value={data?.[q.field]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
