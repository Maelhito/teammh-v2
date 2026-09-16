"use client";

import { useEffect, useRef, useState } from "react";
import { cardStyle, uploadToTtlBucket } from "../TtlShared";
import { TTL_PLAN_CALORIES } from "@/lib/ttl";
import type { TtlPlanAlimentaire } from "@/lib/ttl";
import { pdfEnImages } from "./pdfEnImages";

export default function PlansAdmin() {
  const [plans, setPlans] = useState<TtlPlanAlimentaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifier, setNotifier] = useState(false);

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

  function onSaved(plan: TtlPlanAlimentaire) {
    setPlans((prev) => [...prev.filter((p) => p.calories !== plan.calories), plan]);
  }

  async function handleDelete(plan: TtlPlanAlimentaire) {
    if (!confirm(`Retirer le plan ${plan.calories} kcal de l'app ?`)) return;
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
        Un PDF par apport calorique. Chaque page est transformée en image pour que les clientes la feuillettent dans l&apos;app.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--admin-text-muted)", marginBottom: 12 }}>
        <input type="checkbox" checked={notifier} onChange={(e) => setNotifier(e.target.checked)} />
        Envoyer une notification aux clientes TTL quand j&apos;ajoute un plan
      </label>

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {TTL_PLAN_CALORIES.map((calories) => (
            <PlanSlot
              key={calories}
              calories={calories}
              plan={plans.find((p) => p.calories === calories) ?? null}
              notifier={notifier}
              onSaved={onSaved}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanSlot({
  calories,
  plan,
  notifier,
  onSaved,
  onDelete,
}: {
  calories: number;
  plan: TtlPlanAlimentaire | null;
  notifier: boolean;
  onSaved: (plan: TtlPlanAlimentaire) => void;
  onDelete: (plan: TtlPlanAlimentaire) => void;
}) {
  const [etape, setEtape] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choisis un fichier PDF");
      return;
    }
    setError(null);

    try {
      const images = await pdfEnImages(file, (page, total) => setEtape(`Lecture page ${page}/${total}…`));

      setEtape("Envoi du PDF…");
      const pdf = await uploadToTtlBucket("ttl-docs", file, `plan-${calories}kcal.pdf`);
      if ("error" in pdf) { setError(pdf.error); return; }

      const pages: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setEtape(`Envoi page ${i + 1}/${images.length}…`);
        const img = await uploadToTtlBucket("ttl-images", images[i], `plan-${calories}kcal-page-${i + 1}.jpg`);
        if ("error" in img) { setError(img.error); return; }
        pages.push(img.url);
      }

      setEtape("Enregistrement…");
      const res = await fetch("/api/admin/ttl/plans-alimentaires", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories, pdf_url: pdf.url, pages, notifier }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      onSaved(d.plan);
    } catch (err) {
      setError(err instanceof Error ? `PDF illisible : ${err.message}` : "PDF illisible");
    } finally {
      setEtape(null);
    }
  }

  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <p style={{ margin: "0 0 10px", fontWeight: 800, color: "var(--admin-text)", fontSize: 16 }}>{calories} kcal</p>

      {plan ? (
        <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
          <img src={plan.pages[0]} alt={`Plan ${calories} kcal`} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "1px solid var(--admin-border)" }} />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--admin-text-muted)" }}>{plan.pages.length} page{plan.pages.length > 1 ? "s" : ""} · ouvrir le PDF</p>
        </a>
      ) : (
        <div style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 8, border: "1px dashed var(--admin-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--admin-text-muted)", fontSize: 12 }}>
          Pas encore de plan
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!!etape} style={{ ...btn, backgroundColor: "#B22222", borderColor: "#B22222", color: "#fff", flex: 1, cursor: etape ? "not-allowed" : "pointer" }}>
          {etape ?? (plan ? "Remplacer le PDF" : "Ajouter le PDF")}
        </button>
        {plan && !etape && (
          <button type="button" onClick={() => onDelete(plan)} style={btn}>✕</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={handleFile} />
      {error && <p style={{ fontSize: 11, color: "#F87171", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 10px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 8, color: "var(--admin-text-muted)", fontSize: 12, fontWeight: 700,
};
