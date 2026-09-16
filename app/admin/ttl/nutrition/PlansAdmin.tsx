"use client";

import { useEffect, useRef, useState } from "react";
import { cardStyle, uploadToTtlBucket } from "../TtlShared";
import { TTL_PLAN_CALORIES } from "@/lib/ttl";
import { pdfEnImages } from "./pdfEnImages";

interface PlanAdmin {
  id: string;
  calories: number;
  numero: number;
  nb_pages: number;
  pdf_url: string;
  couverture: string | null;
}

/** Nombre d'envois simultanés vers le stockage. */
const ENVOIS_PARALLELES = 4;

/** Découpe le PDF, envoie le PDF et toutes ses images, et renvoie leurs URLs. */
async function preparerPlan(file: File, nom: string, onEtape: (etape: string) => void) {
  const images = await pdfEnImages(file, (page, total) => onEtape(`Lecture page ${page}/${total}…`));

  onEtape("Envoi du PDF…");
  const pdf = await uploadToTtlBucket("ttl-docs", file, `${nom}.pdf`);
  if ("error" in pdf) throw new Error(pdf.error);

  const pages: string[] = new Array(images.length);
  const miniatures: string[] = new Array(images.length);
  let envoyees = 0;
  for (let debut = 0; debut < images.length; debut += ENVOIS_PARALLELES) {
    await Promise.all(images.slice(debut, debut + ENVOIS_PARALLELES).map(async (img, j) => {
      const i = debut + j;
      const [grande, mini] = await Promise.all([
        uploadToTtlBucket("ttl-images", img.grande, `${nom}-page-${i + 1}.jpg`),
        uploadToTtlBucket("ttl-images", img.miniature, `${nom}-mini-${i + 1}.jpg`),
      ]);
      if ("error" in grande) throw new Error(grande.error);
      if ("error" in mini) throw new Error(mini.error);
      pages[i] = grande.url;
      miniatures[i] = mini.url;
      envoyees++;
      onEtape(`Envoi page ${envoyees}/${images.length}…`);
    }));
  }

  return { pdf_url: pdf.url, pages, miniatures };
}

export default function PlansAdmin() {
  const [plans, setPlans] = useState<PlanAdmin[]>([]);
  const [calories, setCalories] = useState<number>(TTL_PLAN_CALORIES[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifier, setNotifier] = useState(false);
  const [etape, setEtape] = useState<{ cible: string; texte: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cibleRef = useRef<PlanAdmin | "nouveau">("nouveau");

  useEffect(() => {
    fetch("/api/admin/ttl/plans-alimentaires")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setPlans(d.plans ?? []);
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const plansDuNiveau = plans.filter((p) => p.calories === calories).sort((a, b) => a.numero - b.numero);
  const prochainNumero = plansDuNiveau.reduce((max, p) => Math.max(max, p.numero), 0) + 1;

  function choisirFichier(cible: PlanAdmin | "nouveau") {
    cibleRef.current = cible;
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choisis un fichier PDF");
      return;
    }

    const cible = cibleRef.current;
    const numero = cible === "nouveau" ? prochainNumero : cible.numero;
    const cles = cible === "nouveau" ? "nouveau" : cible.id;
    setError(null);

    try {
      const contenu = await preparerPlan(file, `plan-${calories}kcal-n${numero}`, (texte) => setEtape({ cible: cles, texte }));
      setEtape({ cible: cles, texte: "Enregistrement…" });
      const res = await fetch("/api/admin/ttl/plans-alimentaires", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cible === "nouveau"
          ? { calories, numero, notifier, ...contenu }
          : { id: cible.id, ...contenu }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setPlans((prev) => [...prev.filter((p) => p.id !== d.plan.id), d.plan]);
    } catch (err) {
      setError(err instanceof Error ? `Échec : ${err.message}` : "Échec de l'envoi");
    } finally {
      setEtape(null);
    }
  }

  async function handleDelete(plan: PlanAdmin) {
    if (!confirm(`Retirer le plan N°${plan.numero} (${plan.calories} kcal) de l'app ?`)) return;
    const res = await fetch("/api/admin/ttl/plans-alimentaires", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id }),
    });
    if (res.ok) setPlans((prev) => prev.filter((p) => p.id !== plan.id));
  }

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--admin-text)", margin: "0 0 4px", fontFamily: "system-ui" }}>Plans alimentaires</h2>
      <p style={{ fontSize: 12, color: "var(--admin-text-muted)", margin: "0 0 12px" }}>
        Chaque page du PDF est transformée en image : les clientes feuillettent le plan dans l&apos;app, sans pouvoir télécharger le PDF.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TTL_PLAN_CALORIES.map((c) => {
          const nb = plans.filter((p) => p.calories === c).length;
          const actif = c === calories;
          return (
            <button key={c} type="button" onClick={() => setCalories(c)} disabled={!!etape} style={{ ...btn, padding: "8px 14px", fontSize: 13, ...(actif ? { backgroundColor: "#B22222", borderColor: "#B22222", color: "#fff" } : {}) }}>
              {c} kcal <span style={{ opacity: 0.7, fontWeight: 400 }}>({nb})</span>
            </button>
          );
        })}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--admin-text-muted)", marginBottom: 12 }}>
        <input type="checkbox" checked={notifier} onChange={(e) => setNotifier(e.target.checked)} />
        Envoyer une notification aux clientes TTL quand j&apos;ajoute un plan
      </label>

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
          {plansDuNiveau.map((plan) => {
            const enCours = etape?.cible === plan.id;
            return (
              <div key={plan.id} style={{ ...cardStyle, padding: 12 }}>
                <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
                  {plan.couverture ? (
                    <img src={plan.couverture} alt={`Plan N°${plan.numero}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "1px solid var(--admin-border)" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 8, backgroundColor: "var(--admin-card)" }} />
                  )}
                  <p style={{ margin: "8px 0 0", fontWeight: 800, color: "var(--admin-text)", fontSize: 14 }}>Plan N°{plan.numero}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--admin-text-muted)" }}>{plan.nb_pages} pages · voir le PDF</p>
                </a>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button type="button" onClick={() => choisirFichier(plan)} disabled={!!etape} style={{ ...btn, flex: 1 }}>
                    {enCours ? etape.texte : "Remplacer le PDF"}
                  </button>
                  {!enCours && <button type="button" onClick={() => handleDelete(plan)} disabled={!!etape} style={btn}>✕</button>}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => choisirFichier("nouveau")}
            disabled={!!etape}
            style={{ ...cardStyle, padding: 12, minHeight: 200, border: "1px dashed var(--admin-border)", color: etape?.cible === "nouveau" ? "var(--admin-text)" : "var(--admin-text-muted)", fontSize: 13, fontWeight: 700, whiteSpace: "pre-line", cursor: etape ? "not-allowed" : "pointer" }}
          >
            {etape?.cible === "nouveau" ? etape.texte : `+ Ajouter le plan N°${prochainNumero}\n(${calories} kcal)`}
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 10px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 8, color: "var(--admin-text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
