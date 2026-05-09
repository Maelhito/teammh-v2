"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import SeanceBuilder, { FORMATS, decodeSeance, encodeSeance, type SeanceData } from "../SeanceBuilder";

export default function SeanceDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<SeanceData|null>(null);
  const [format, setFormat] = useState("classique");
  const [duree, setDuree] = useState("45");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/seances/${id}`);
    const d = await res.json();
    if (d.seance) {
      setFormat(d.seance.type_format ?? "classique");
      setDuree(d.seance.duree_estimee?.toString() ?? "45");
      setData(decodeSeance(d.seance, d.exercices ?? []));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!data) return;
    setError(""); setSaving(true);
    const { description, flat_exercices } = encodeSeance(data);
    const res = await fetch(`/api/coach/seances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: data.nom, type_format: format, duree_estimee: parseInt(duree)||null, description, exercices: flat_exercices }),
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); setError(d.error??"Erreur"); }
    else router.push("/coach/seances");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #2a2a2a", backgroundColor:"#161616", fontSize:13, color:"#F5F5F0", fontFamily:"system-ui", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:10, fontWeight:700, color:"#666", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:3, fontFamily:"system-ui" };

  if (!data) return <p style={{ fontSize:13, color:"#555", fontFamily:"system-ui" }}>Chargement…</p>;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={()=>router.push("/coach/seances")} style={{ background:"none", border:"1px solid #222", borderRadius:7, padding:"6px 12px", fontSize:12, color:"#888", cursor:"pointer", fontFamily:"system-ui" }}>← Retour</button>
        <h1 style={{ fontSize:"1.1rem", fontWeight:800, color:"#F5F5F0", margin:0, fontFamily:"system-ui" }}>✏️ {data.nom}</h1>
      </div>

      {/* Infos */}
      <div style={{ backgroundColor:"#111", borderRadius:12, border:"1px solid #1a1a1a", padding:"16px 18px", marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12 }}>
          <div><label style={lbl}>Nom</label><input style={inp} value={data.nom} onChange={e=>setData(d=>d?{...d,nom:e.target.value}:d)} /></div>
          <div>
            <label style={lbl}>Format global</label>
            <select style={{ ...inp, cursor:"pointer" }} value={format} onChange={e=>setFormat(e.target.value)}>
              {FORMATS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Durée (min)</label><input style={inp} type="number" value={duree} onChange={e=>setDuree(e.target.value)} /></div>
        </div>
        <div style={{ marginTop:10 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, height:44, resize:"vertical" }} value={data.note} onChange={e=>setData(d=>d?{...d,note:e.target.value}:d)} /></div>
      </div>

      <SeanceBuilder data={data} onChange={setData} />

      {error&&<p style={{ fontSize:12, color:"#EF4444", margin:"10px 0 0", fontFamily:"system-ui" }}>{error}</p>}
      <button onClick={handleSave} disabled={saving}
        style={{ marginTop:12, width:"100%", padding:"12px", borderRadius:9, border:"none", backgroundColor:saving?"#333":"#B22222", color:saving?"#666":"#fff", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"system-ui" }}>
        {saving?"Enregistrement…":"✅ Sauvegarder les modifications"}
      </button>
    </div>
  );
}
