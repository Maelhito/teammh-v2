"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader, FileUploadButton } from "../TtsShared";

interface Macros {
  calories?: number;
  proteines?: number;
  glucides?: number;
  lipides?: number;
}

interface Recette {
  id: string;
  titre: string;
  photo_url: string | null;
  texte: string | null;
  ingredients: string | null;
  macros: Macros | null;
}

export default function NutritionAdmin() {
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [titre, setTitre] = useState("");
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [texte, setTexte] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [calories, setCalories] = useState("");
  const [proteines, setProteines] = useState("");
  const [glucides, setGlucides] = useState("");
  const [lipides, setLipides] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/tts/recettes")
      .then((r) => r.json())
      .then((d) => setRecettes(d.recettes ?? []))
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  function updateIngredient(idx: number, value: string) {
    setIngredients((prev) => prev.map((v, i) => (i === idx ? value : v)));
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, ""]);
  }

  function removeIngredientRow(idx: number) {
    setIngredients((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    if (!titre.trim()) return;
    if (cleanIngredients.length === 0) {
      setError("Au moins un ingrédient est requis");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const macros: Macros = {};
      if (calories) macros.calories = Number(calories);
      if (proteines) macros.proteines = Number(proteines);
      if (glucides) macros.glucides = Number(glucides);
      if (lipides) macros.lipides = Number(lipides);

      const res = await fetch("/api/admin/tts/recettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre,
          photo_url: photo?.url ?? null,
          texte: texte || null,
          ingredients: cleanIngredients.map((i) => `- ${i}`).join("\n"),
          macros: Object.keys(macros).length ? macros : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setRecettes((prev) => [d.recette, ...prev]);
      setTitre(""); setPhoto(null); setTexte(""); setIngredients([""]);
      setCalories(""); setProteines(""); setGlucides(""); setLipides("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/admin/tts/recettes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setRecettes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <PageHeader title="Nutrition Time To Start" subtitle="Bibliothèque de recettes (photo, texte, ingrédients, macros)" />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <form onSubmit={handleAdd} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <input type="text" placeholder="Titre de la recette" value={titre} onChange={(e) => setTitre(e.target.value)} style={inputStyle} />

        <FileUploadButton
          bucket="tts-images"
          accept="image/*"
          label="🖼 Ajouter une photo (optionnel)"
          value={photo}
          onUploaded={setPhoto}
        />

        <textarea placeholder="Description / préparation" value={texte} onChange={(e) => setTexte(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />

        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--admin-text-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>
            INGRÉDIENTS (au moins un requis)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "var(--admin-text-muted)", fontSize: 14 }}>•</span>
                <input
                  type="text"
                  placeholder="ex: 200g de poulet"
                  value={ing}
                  onChange={(e) => updateIngredient(idx, e.target.value)}
                  style={inputStyle}
                />
                <button type="button" onClick={() => removeIngredientRow(idx)} disabled={ingredients.length === 1} style={btnGhost}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addIngredientRow} style={{ ...btnGhost, marginTop: 6 }}>+ Ingrédient</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <input type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} style={inputStyle} />
          <input type="number" placeholder="Protéines (g)" value={proteines} onChange={(e) => setProteines(e.target.value)} style={inputStyle} />
          <input type="number" placeholder="Glucides (g)" value={glucides} onChange={(e) => setGlucides(e.target.value)} style={inputStyle} />
          <input type="number" placeholder="Lipides (g)" value={lipides} onChange={(e) => setLipides(e.target.value)} style={inputStyle} />
        </div>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "..." : "+ Recette"}</button>
      </form>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {recettes.map((r) => (
            <div key={r.id} style={cardStyle}>
              {r.photo_url && (
                <img src={r.photo_url} alt={r.titre} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 14 }}>{r.titre}</p>
                <button onClick={() => handleDelete(r.id)} style={btnGhost}>✕</button>
              </div>
              {r.ingredients && (
                <pre style={{ margin: "6px 0 0", fontSize: 11, color: "var(--admin-text-muted)", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{r.ingredients}</pre>
              )}
              {r.macros && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--admin-text-muted)" }}>
                  {r.macros.calories ? `${r.macros.calories} kcal` : ""}{r.macros.proteines ? ` · P ${r.macros.proteines}g` : ""}{r.macros.glucides ? ` · G ${r.macros.glucides}g` : ""}{r.macros.lipides ? ` · L ${r.macros.lipides}g` : ""}
                </p>
              )}
            </div>
          ))}
          {recettes.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucune recette pour l&apos;instant.</p>}
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px", backgroundColor: "#B22222", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start",
};
const btnGhost: React.CSSProperties = {
  padding: "3px 8px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 6, color: "var(--admin-text-muted)", fontSize: 12, cursor: "pointer", flexShrink: 0,
};
