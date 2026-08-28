"use client";

import { useState } from "react";
import { MODULE_0_STEPS, stepCompletionSlug, type Module0Step } from "@/lib/module-0-steps";
import type { ModuleContent } from "@/lib/modules-content";
import { QUESTIONNAIRE_GROUPS, TOTAL_QUESTIONS } from "@/lib/questionnaire-demarrage";

/** Nombre d'emplacements vidéo proposés par point */
const VIDEO_SLOTS = 5;

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  backgroundColor: "#0D0D0D",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#FFFFFF",
  fontSize: 12,
  outline: "none",
};

function btnStyle(saving: boolean): React.CSSProperties {
  return {
    backgroundColor: saving ? "#8B1515" : "#B22222",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0 14px",
    fontSize: 11,
    fontWeight: 700,
    cursor: saving ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

/**
 * Aperçu en lecture seule des questions du questionnaire de démarrage.
 * Les questions sont définies dans lib/questionnaire-demarrage.ts (pas en base) :
 * cet aperçu sert à vérifier ce qui est demandé aux clientes.
 */
function QuestionnairePreview() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "#0D0D0D", border: "1px solid #1F1F1F", borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "system-ui", fontWeight: 700, letterSpacing: "0.04em" }}>
          📋 QUESTIONNAIRE DE DÉMARRAGE
          <span style={{ marginLeft: 8, fontWeight: 400, color: "#555", letterSpacing: 0 }}>
            {TOTAL_QUESTIONS} questions · s&apos;affiche sous les vidéos
          </span>
        </span>
        <span style={{ fontSize: "0.7rem", color: "#555", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", fontFamily: "system-ui", lineHeight: 1.5 }}>
            Aperçu en lecture seule. Les réponses des clientes apparaissent sur leur fiche, au-dessus du
            calendrier ; les 4 objectifs sont aussi recopiés dans leur profil.
          </p>

          {QUESTIONNAIRE_GROUPS.map((group) => (
            <div key={group.title} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "system-ui" }}>
                {group.title}
              </p>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                {group.questions.map((q) => (
                  <li key={q.field} style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontFamily: "system-ui", lineHeight: 1.45 }}>
                    {q.label}
                    <span style={{ color: "#555", marginLeft: 6 }}>
                      {q.kind === "ouinon" ? "(Oui / Non)" : q.kind === "textarea" ? "(texte long)" : "(texte court)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepSection({ step, content }: { step: Module0Step; content: ModuleContent | null }) {
  const slug = stepCompletionSlug(step.key);
  const [open, setOpen] = useState(false);

  const [titles, setTitles] = useState<string[]>(
    Array.from({ length: VIDEO_SLOTS }, (_, i) => (content?.[`video_title_${i + 1}` as keyof ModuleContent] as string | null) ?? "")
  );
  const [urls, setUrls] = useState<string[]>(
    Array.from({ length: VIDEO_SLOTS }, (_, i) => (content?.[`video_url_${i + 1}` as keyof ModuleContent] as string | null) ?? "")
  );
  const [saving, setSaving] = useState<boolean[]>(Array(VIDEO_SLOTS).fill(false));
  const [msgs, setMsgs] = useState<string[]>(Array(VIDEO_SLOTS).fill(""));

  // Lien externe (questionnaire alimentaire)
  const [lien, setLien] = useState(content?.lien_canva_equivalences ?? "");
  const [savingLien, setSavingLien] = useState(false);
  const [lienMsg, setLienMsg] = useState("");

  // État RÉELLEMENT enregistré en base — sert aux badges de l'en-tête.
  // Ne bouge que sur sauvegarde réussie : un champ tapé mais non sauvegardé ne
  // doit jamais afficher "ok".
  const [savedUrls, setSavedUrls] = useState<string[]>(
    Array.from({ length: VIDEO_SLOTS }, (_, i) => (content?.[`video_url_${i + 1}` as keyof ModuleContent] as string | null) ?? "")
  );
  const [savedLien, setSavedLien] = useState(content?.lien_canva_equivalences ?? "");

  const filled = savedUrls.filter((u) => u.trim()).length;

  /** Enregistre le titre ET l'URL d'un emplacement, sans notification push */
  async function saveSlot(i: number) {
    setSaving((p) => { const n = [...p]; n[i] = true; return n; });
    setMsgs((p) => { const n = [...p]; n[i] = ""; return n; });
    try {
      const [rTitle, rUrl] = await Promise.all([
        fetch("/api/admin/video-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, field: `video_title_${i + 1}`, title: titles[i] }),
        }),
        fetch("/api/admin/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, field: `video_url_${i + 1}`, url: urls[i], silent: true }),
        }),
      ]);
      const ok = rTitle.ok && rUrl.ok;
      let err = "";
      if (!ok) {
        const d = await (rUrl.ok ? rTitle : rUrl).json().catch(() => ({}));
        err = d.error ?? "Erreur";
      } else {
        setSavedUrls((p) => { const n = [...p]; n[i] = urls[i]; return n; });
      }
      setMsgs((p) => { const n = [...p]; n[i] = ok ? "✓ Sauvegardé" : err; return n; });
    } catch {
      setMsgs((p) => { const n = [...p]; n[i] = "Erreur réseau — rien n'a été sauvegardé, réessaie."; return n; });
    } finally {
      setSaving((p) => { const n = [...p]; n[i] = false; return n; });
    }
  }

  async function saveLien() {
    setSavingLien(true);
    setLienMsg("");
    try {
      const res = await fetch("/api/admin/canva-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, url: lien }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setSavedLien(lien);
      setLienMsg(res.ok ? "✓ Sauvegardé" : (d.error ?? "Erreur"));
    } catch {
      setLienMsg("Erreur réseau — le lien n'a pas été sauvegardé, réessaie.");
    } finally {
      setSavingLien(false);
    }
  }

  return (
    <div style={{ backgroundColor: "#111111", border: "1px solid #1F1F1F", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{step.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--admin-text)", fontFamily: "system-ui" }}>
            {step.index}. {step.title.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: filled ? "#4ADE80" : "#555", fontFamily: "system-ui", flexShrink: 0 }}>
            {step.type === "external" ? (savedLien ? "lien ok" : "lien manquant") : `${filled} vidéo${filled > 1 ? "s" : ""}`}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#555", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 16px" }}>
          {step.hasQuestionnaire && <QuestionnairePreview />}

          {/* Lien externe (questionnaire alimentaire) */}
          {step.type === "external" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
                🔗 Lien du questionnaire (site externe)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  value={lien}
                  onChange={(e) => { setLien(e.target.value); setLienMsg(""); }}
                  placeholder="https://…"
                  style={inputStyle}
                />
                <button onClick={saveLien} disabled={savingLien} style={btnStyle(savingLien)}>
                  {savingLien ? "…" : "Enregistrer"}
                </button>
              </div>
              {lienMsg && (
                <p style={{ fontSize: 10, color: lienMsg.startsWith("✓") ? "#4ADE80" : "#F87171", margin: "6px 0 0", fontFamily: "system-ui" }}>
                  {lienMsg}
                </p>
              )}
            </div>
          )}

          {/* Emplacements vidéo */}
          {Array.from({ length: VIDEO_SLOTS }, (_, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < VIDEO_SLOTS - 1 ? "1px solid #1A1A1A" : "none" }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: "0.04em" }}>
                🎥 Vidéo {i + 1}
              </label>
              <input
                type="text"
                value={titles[i]}
                onChange={(e) => { const v = e.target.value; setTitles((p) => { const n = [...p]; n[i] = v; return n; }); }}
                placeholder="Titre de la vidéo"
                style={{ ...inputStyle, width: "100%", marginBottom: 6 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  value={urls[i]}
                  onChange={(e) => { const v = e.target.value; setUrls((p) => { const n = [...p]; n[i] = v; return n; }); }}
                  placeholder="Lien YouTube (watch, youtu.be, shorts…)"
                  style={inputStyle}
                />
                <button onClick={() => saveSlot(i)} disabled={saving[i]} style={btnStyle(saving[i])}>
                  {saving[i] ? "…" : "Enregistrer"}
                </button>
              </div>
              {msgs[i] && (
                <p style={{ fontSize: 10, color: msgs[i].startsWith("✓") ? "#4ADE80" : "#F87171", margin: "6px 0 0", fontFamily: "system-ui" }}>
                  {msgs[i]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Module0Admin({ contentBySlug }: { contentBySlug: Record<string, ModuleContent> }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 3, height: 16, backgroundColor: "#B45309", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--admin-text)", margin: 0, fontFamily: "system-ui", letterSpacing: "0.03em" }}>
          🚀 MODULE DE DÉMARRAGE
        </h2>
        <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", marginLeft: "auto" }}>
          {MODULE_0_STEPS.length} points
        </span>
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 14px", fontFamily: "system-ui" }}>
        Contenu vu par les nouvelles clientes avant leur appel de démarrage. Aucune notification n&apos;est envoyée depuis ici.
      </p>

      {MODULE_0_STEPS.map((step) => (
        <StepSection key={step.key} step={step} content={contentBySlug[stepCompletionSlug(step.key)] ?? null} />
      ))}
    </div>
  );
}
