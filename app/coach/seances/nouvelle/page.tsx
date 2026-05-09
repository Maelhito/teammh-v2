"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SeanceBuilder, { FORMATS, defaultBloc, encodeSeance, type SeanceData } from "../SeanceBuilder";

const initData = (): SeanceData => ({
  nom: "", note: "",
  blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)],
});

export default function NouvelleSeancePage() {
  const router = useRouter();
  const [step, setStep] = useState<1|2>(1);
  const [nom, setNom] = useState("");
  const [format, setFormat] = useState("classique");
  const [duree, setDuree] = useState("45");
  const [note, setNote] = useState("");
  const [seanceData, setSeanceData] = useState<SeanceData>(initData());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError(""); setSaving(true);
    try {
      const data: SeanceData = { ...seanceData, nom, note };
      const { description, flat_exercices } = encodeSeance(data);
      const res = await fetch("/api/coach/seances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, type_format: format, duree_estimee: parseInt(duree)||null, description, exercices: flat_exercices }),
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) { setError(d.error??"Erreur"); setSaving(false); return; }
      router.push("/coach/seances");
    } catch { setError("Impossible de contacter le serveur."); setSaving(false); }
  }

  const inp: React.CSSProperties = { width:"100%", padding:"9px 11px", borderRadius:8, border:"1px solid #2a2a2a", backgroundColor:"#161616", fontSize:13, color:"#F5F5F0", fontFamily:"system-ui", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:11, fontWeight:700, color:"#666", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4, fontFamily:"system-ui" };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>step===1?router.push("/coach/seances"):setStep(1)} style={{ background:"none", border:"1px solid #222", borderRadius:7, padding:"6px 12px", fontSize:12, color:"#888", cursor:"pointer", fontFamily:"system-ui" }}>← Retour</button>
        <div>
          <p style={{ fontSize:10, color:"#555", letterSpacing:"0.12em", textTransform:"uppercase", margin:"0 0 1px", fontFamily:"system-ui" }}>Nouvelle séance</p>
          <h1 style={{ fontSize:"1.2rem", fontWeight:800, color:"#F5F5F0", margin:0, fontFamily:"system-ui" }}>{step===1?"Informations":nom}</h1>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:20 }}>
        {[{n:1,l:"Infos"},{n:2,l:"Blocs & exercices"}].map(({n,l},i)=>(
          <div key={n} style={{ display:"flex", alignItems:"center" }}>
            {i>0&&<div style={{ width:40, height:2, backgroundColor:step>1?"#B22222":"#222" }} />}
            <div style={{ display:"flex", alignItems:"center", gap:6, cursor:n<step?"pointer":"default" }} onClick={()=>n<step&&setStep(n as 1|2)}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:step>=n?"#B22222":"#1a1a1a", color:step>=n?"#fff":"#555", fontSize:10, fontWeight:700, fontFamily:"system-ui" }}>{n}</div>
              <span style={{ fontSize:11, fontWeight:step===n?700:400, color:step===n?"#F5F5F0":"#555", fontFamily:"system-ui" }}>{l}</span>
            </div>
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={{ backgroundColor:"#111", borderRadius:14, border:"1px solid #1a1a1a", padding:"22px", maxWidth:600 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div><label style={lbl}>Nom de la séance *</label><input style={inp} value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ex: Full Body Débutant" /></div>
            <div>
              <label style={lbl}>Format principal</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
                {FORMATS.map(f=>(
                  <button key={f.value} type="button" onClick={()=>setFormat(f.value)} style={{ padding:"8px 10px", borderRadius:8, textAlign:"left", border:format===f.value?"2px solid #B22222":"1px solid #222", backgroundColor:format===f.value?"rgba(178,34,34,0.08)":"#161616", cursor:"pointer" }}>
                    <p style={{ fontSize:12, fontWeight:700, color:format===f.value?"#B22222":"#F5F5F0", margin:0, fontFamily:"system-ui" }}>{f.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div><label style={lbl}>Durée totale estimée (min)</label><input style={{ ...inp, maxWidth:100 }} type="number" min="1" value={duree} onChange={e=>setDuree(e.target.value)} /></div>
            <div><label style={lbl}>Notes</label><textarea style={{ ...inp, height:60, resize:"vertical" }} value={note} onChange={e=>setNote(e.target.value)} placeholder="Objectif, niveau…" /></div>
            {error&&<p style={{ fontSize:12, color:"#EF4444", margin:0, fontFamily:"system-ui" }}>{error}</p>}
            <button onClick={()=>{if(!nom.trim()){setError("Nom obligatoire.");return;}setError("");setStep(2);}} disabled={!nom.trim()}
              style={{ padding:"11px", borderRadius:9, border:"none", backgroundColor:!nom.trim()?"#1a1a1a":"#B22222", color:!nom.trim()?"#555":"#fff", fontSize:13, fontWeight:700, cursor:!nom.trim()?"not-allowed":"pointer", fontFamily:"system-ui" }}>
              Suivant → Construire la séance
            </button>
          </div>
        </div>
      )}

      {step===2&&(
        <div>
          <SeanceBuilder data={{ ...seanceData, nom, note }} onChange={d=>setSeanceData(d)} />
          {error&&<p style={{ fontSize:12, color:"#EF4444", margin:"10px 0 0", fontFamily:"system-ui" }}>{error}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ marginTop:12, width:"100%", padding:"12px", borderRadius:9, border:"none", backgroundColor:saving?"#333":"#B22222", color:saving?"#666":"#fff", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"system-ui" }}>
            {saving?"Enregistrement…":`✅ Sauvegarder (${seanceData.blocs.reduce((a,b)=>a+b.exercices.length,0)} exercices)`}
          </button>
        </div>
      )}
    </div>
  );
}
