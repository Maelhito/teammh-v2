"use client";

import { useEffect, useState } from "react";
import {
  QUESTIONNAIRE_GROUPS,
  countAnswered,
  TOTAL_QUESTIONS,
  type QuestionnaireDemarrage,
} from "@/lib/questionnaire-demarrage";

/**
 * Questionnaire de démarrage de la cliente — lecture seule pour le coach.
 * Affiché au-dessus du calendrier sur la fiche cliente.
 */
export default function QuestionnaireCliente({ clienteId }: { clienteId: string }) {
  const [data, setData] = useState<QuestionnaireDemarrage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
    return () => { cancelled = true; };
  }, [clienteId]);

  const answered = countAnswered(data);
  // Groupes 3 et 4 (accompagnement, sport) — les objectifs sont affichés à part
  const [, , accompagnement, sport] = QUESTIONNAIRE_GROUPS;

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

  if (!data) {
    return (
      <div style={card}>
        <p style={lbl}>Questionnaire de démarrage</p>
        <p style={{ fontSize: 12, color: "#bbb", margin: 0, fontFamily: "system-ui" }}>
          Pas encore rempli par la cliente.
        </p>
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
        <button
          onClick={() => setShowAll((s) => !s)}
          style={{
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
          }}
        >
          {showAll ? "Réduire" : "Voir tout"}
        </button>
      </div>

      {/* Objectifs — toujours visibles */}
      <div className="coach-cliente-2col">
        <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
            Objectifs 4 mois
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Answer label="Poids" value={data.objectif_4mois_poids} />
            <Answer label="Bien-être" value={data.objectif_4mois_bienetre} />
          </div>
        </div>
        <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
            Objectifs 12 mois
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Answer label="Poids" value={data.objectif_12mois_poids} />
            <Answer label="Bien-être" value={data.objectif_12mois_bienetre} />
          </div>
        </div>
      </div>

      {/* Reste du questionnaire */}
      {showAll && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f5f5f5", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
              {accompagnement.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {accompagnement.questions.map((q) => (
                <Answer key={q.field} label={q.label} value={data[q.field]} />
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
              {sport.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sport.questions.map((q) => (
                <Answer key={q.field} label={q.label} value={data[q.field]} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
