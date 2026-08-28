"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ProgrammeBuilder, { encodeProgData, decodeProgData, countGridItems, type ProgrammeData } from "../ProgrammeBuilder";
import { NIVEAUX } from "../../seances/SeanceBuilder";
import { PROG_CATEGORIES, AVANCEMENTS, CYCLE_PROGS, estCycle } from "../constantes";
import ImageUpload from "@/components/ImageUpload";
import { usePeutModifierBibliotheque } from "../../useDroitsCoach";

/** Un coach consulte les modèles ; il adapte le programme DE SA CLIENTE depuis
 *  sa fiche, sur une copie qui ne touche jamais le modèle d'origine. */
const LECTURE_SEULE_TEXTE =
  "Ce programme est un modèle partagé par toute l'équipe : seul un admin peut le modifier. Pour l'adapter à une cliente, assigne-le puis modifie ses séances depuis sa fiche — sa copie est indépendante du modèle.";

export default function EditProgrammePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<ProgrammeData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const peutModifier = usePeutModifierBibliotheque();

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/programmes/${id}`);
    const d = await res.json();
    if (d.programme) { setData(decodeProgData(d.programme)); setImageUrl(d.programme.image_url ?? null); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!data) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/coach/programmes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: data.nom, categorie: data.categorie, niveau: data.niveau,
        duree_semaines: data.duree_semaines,
        description: encodeProgData(data),
        image_url: imageUrl,
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); }
    else router.push("/coach/programmes");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  if (!data) return <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>Chargement…</p>;

  const totalItems = countGridItems(data.grid, data.duree_semaines).visibles;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => router.push("/coach/programmes")} style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{peutModifier ? "✏️" : "👁"} {data.nom}</h1>
      </div>

      {!peutModifier && (
        <div style={{ margin: "0 0 14px", padding: "10px 14px", borderRadius: 9, backgroundColor: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <p style={{ fontSize: 12, color: "#F59E0B", margin: 0, fontWeight: 700, fontFamily: "system-ui" }}>👁 Lecture seule</p>
          <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0", fontFamily: "system-ui", lineHeight: 1.5 }}>
            {LECTURE_SEULE_TEXTE}
          </p>
        </div>
      )}

      <div style={peutModifier ? undefined : { pointerEvents: "none", opacity: 0.75 }}>

      {/* Infos */}
      <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #1a1a1a", padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>Nom</label><input style={inp} value={data.nom} onChange={e => setData(d => d ? { ...d, nom: e.target.value } : d)} /></div>
          <div>
            <label style={lbl}>Catégorie</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.categorie} onChange={e => setData(d => d ? { ...d, categorie: e.target.value } : d)}>
              <option value="">Non renseignée</option>
              {PROG_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Avancement</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.avancement}
              onChange={e => setData(d => d ? { ...d, avancement: e.target.value, cycle_prog: estCycle(e.target.value) ? d.cycle_prog : "" } : d)}>
              <option value="">Non renseigné</option>
              {AVANCEMENTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {estCycle(data.avancement) && (
            <div>
              <label style={lbl}>Prog du cycle</label>
              <select style={{ ...inp, cursor: "pointer" }} value={data.cycle_prog} onChange={e => setData(d => d ? { ...d, cycle_prog: e.target.value } : d)}>
                <option value="">Non renseigné</option>
                {CYCLE_PROGS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={lbl}>Niveau</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.niveau} onChange={e => setData(d => d ? { ...d, niveau: e.target.value } : d)}>
              {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Durée (semaines)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input style={{ ...inp, width: 70, textAlign: "center" }} type="number" min="1" max="24"
                value={data.duree_semaines}
                onChange={e => setData(d => d ? { ...d, duree_semaines: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) } : d)} />
              <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", whiteSpace: "nowrap" }}>semaine{data.duree_semaines > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <div>
          <label style={lbl}>Image de couverture</label>
          <ImageUpload value={imageUrl} onChange={setImageUrl} dark />
        </div>
      </div>

      <ProgrammeBuilder data={data} onChange={setData} />

      </div>

      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}
      {peutModifier && (
        <button onClick={handleSave} disabled={saving}
          style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
          {saving ? "Enregistrement…" : `✅ Sauvegarder (${totalItems} élément${totalItems > 1 ? "s" : ""})`}
        </button>
      )}
    </div>
  );
}
