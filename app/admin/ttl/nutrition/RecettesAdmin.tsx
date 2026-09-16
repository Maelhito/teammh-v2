"use client";

import { useEffect, useRef, useState } from "react";
import { cardStyle, uploadToTtlBucket, Modal } from "../TtlShared";
import {
  categorieAvecGout,
  TTL_RECETTE_CALORIES,
  TTL_RECETTE_CATEGORIE_LABELS as CATEGORIE_LABELS,
  TTL_RECETTE_GOUT_LABELS as GOUT_LABELS,
} from "@/lib/ttl";
import type { TtlRecette, TtlRecetteCategorie as Categorie, TtlRecetteGout as Gout } from "@/lib/ttl";
import { miniature } from "./miniature";

const CATEGORIES = Object.keys(CATEGORIE_LABELS) as Categorie[];
const GOUTS = Object.keys(GOUT_LABELS) as Gout[];

/** « burrito-oeufs_brouilles.png » → « Burrito oeufs brouilles » */
function titreDepuisFichier(nom: string) {
  const base = nom.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Recette";
}

function libelleRangement(r: Pick<TtlRecette, "categorie" | "gout" | "calories">) {
  return [
    r.categorie ? CATEGORIE_LABELS[r.categorie] : "Sans catégorie",
    r.gout ? GOUT_LABELS[r.gout].toLowerCase() : null,
    r.calories ? `${r.calories} kcal` : "sans calories",
  ].filter(Boolean).join(" · ");
}

export default function RecettesAdmin() {
  const [recettes, setRecettes] = useState<TtlRecette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categorie, setCategorie] = useState<Categorie>("repas");
  const [gout, setGout] = useState<Gout | null>(null);
  const [calories, setCalories] = useState<number | null>(null);
  const [notifier, setNotifier] = useState(false);
  const [etape, setEtape] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Categorie | "toutes">("toutes");
  const [apercu, setApercu] = useState<TtlRecette | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/ttl/recettes")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setRecettes(d.recettes ?? []);
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  function choisirCategorie(c: Categorie) {
    setCategorie(c);
    setGout(null);
    setCalories(null);
  }

  const rangementComplet = calories !== null && (!categorieAvecGout(categorie) || gout !== null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0 || !rangementComplet) return;
    setError(null);

    try {
      const fiches = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setEtape(`Envoi ${i + 1}/${files.length}…`);
        const [photo, mini] = await Promise.all([
          uploadToTtlBucket("ttl-images", file, `recette-${file.name}`),
          miniature(file).then((b) => uploadToTtlBucket("ttl-images", b, `recette-mini-${file.name.replace(/\.[^.]+$/, "")}.jpg`)),
        ]);
        if ("error" in photo) throw new Error(photo.error);
        if ("error" in mini) throw new Error(mini.error);
        fiches.push({ titre: titreDepuisFichier(file.name), photo_url: photo.url, miniature_url: mini.url });
      }

      setEtape("Enregistrement…");
      const res = await fetch("/api/admin/ttl/recettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recettes: fiches, categorie, gout, calories, notifier }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setRecettes((prev) => [...d.recettes, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? `Échec : ${err.message}` : "Échec de l'envoi");
    } finally {
      setEtape(null);
    }
  }

  async function ranger(r: TtlRecette, changement: Partial<Pick<TtlRecette, "categorie" | "gout" | "calories">>) {
    const suivant = { ...r, ...changement };
    if (changement.categorie) {
      suivant.gout = categorieAvecGout(changement.categorie) ? r.gout ?? "sucre" : null;
      const tranches = TTL_RECETTE_CALORIES[changement.categorie];
      if (!suivant.calories || !tranches.includes(suivant.calories)) suivant.calories = tranches[0];
    }
    setError(null);
    const res = await fetch("/api/admin/ttl/recettes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, categorie: suivant.categorie, gout: suivant.gout, calories: suivant.calories }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Erreur"); return; }
    setRecettes((prev) => prev.map((x) => (x.id === r.id ? d.recette : x)));
    setApercu((a) => (a?.id === r.id ? d.recette : a));
  }

  async function handleDelete(r: TtlRecette) {
    if (!confirm(`Supprimer « ${r.titre} » ?`)) return;
    const res = await fetch("/api/admin/ttl/recettes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id }),
    });
    if (res.ok) {
      setRecettes((prev) => prev.filter((x) => x.id !== r.id));
      setApercu(null);
    }
  }

  const affichees = filtre === "toutes" ? recettes : recettes.filter((r) => r.categorie === filtre);

  return (
    <div>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--admin-text)", margin: "0 0 4px", fontFamily: "system-ui" }}>Recettes</h2>
      <p style={{ fontSize: 12, color: "var(--admin-text-muted)", margin: "0 0 12px" }}>
        Une recette = une fiche photo. Range-la, puis choisis une ou plusieurs images d&apos;un coup : elles seront toutes rangées au même endroit.
      </p>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <Ligne titre="1. Catégorie">
          {CATEGORIES.map((c) => (
            <Choix key={c} actif={categorie === c} onClick={() => choisirCategorie(c)}>{CATEGORIE_LABELS[c]}</Choix>
          ))}
        </Ligne>

        {categorieAvecGout(categorie) && (
          <Ligne titre="2. Sucré ou salé">
            {GOUTS.map((g) => (
              <Choix key={g} actif={gout === g} onClick={() => setGout(g)}>{GOUT_LABELS[g]}</Choix>
            ))}
          </Ligne>
        )}

        <Ligne titre={`${categorieAvecGout(categorie) ? 3 : 2}. Calories`}>
          {TTL_RECETTE_CALORIES[categorie].map((k) => (
            <Choix key={k} actif={calories === k} onClick={() => setCalories(k)}>{k} kcal</Choix>
          ))}
        </Ligne>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--admin-text-muted)" }}>
          <input type="checkbox" checked={notifier} onChange={(e) => setNotifier(e.target.checked)} />
          Envoyer une notification aux clientes TTL (une seule, même pour plusieurs photos)
        </label>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!rangementComplet || !!etape}
          style={{ ...btnPrimary, opacity: rangementComplet ? 1 : 0.45, cursor: rangementComplet && !etape ? "pointer" : "not-allowed" }}
        >
          {etape ?? (rangementComplet ? "🖼 Choisir les photos des recettes" : "Complète le rangement pour ajouter des photos")}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
      </div>

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Choix actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>Toutes ({recettes.length})</Choix>
        {CATEGORIES.map((c) => (
          <Choix key={c} actif={filtre === c} onClick={() => setFiltre(c)}>
            {CATEGORIE_LABELS[c]} ({recettes.filter((r) => r.categorie === c).length})
          </Choix>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {affichees.map((r) => {
            const incomplet = !r.photo_url || !r.calories || !r.categorie;
            return (
              <div key={r.id} style={{ ...cardStyle, padding: 10, borderColor: incomplet ? "#F87171" : undefined }}>
                <button type="button" onClick={() => setApercu(r)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
                  {r.miniature_url || r.photo_url ? (
                    <img src={r.miniature_url ?? r.photo_url} alt={r.titre} style={{ width: "100%", aspectRatio: "1500 / 1054", objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1500 / 1054", borderRadius: 8, backgroundColor: "var(--admin-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#F87171" }}>
                      Pas de photo : invisible dans l&apos;app
                    </div>
                  )}
                  <p style={{ margin: "8px 0 0", fontWeight: 700, color: "var(--admin-text)", fontSize: 13 }}>{r.titre}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: incomplet ? "#F87171" : "var(--admin-text-muted)" }}>{libelleRangement(r)}</p>
                </button>
              </div>
            );
          })}
          {affichees.length === 0 && <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucune recette ici pour l&apos;instant.</p>}
        </div>
      )}

      {apercu && (
        <Modal onClose={() => setApercu(null)} maxWidth={720}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "var(--admin-text)", fontSize: 15 }}>{apercu.titre}</p>
            <button onClick={() => setApercu(null)} style={{ background: "none", border: "none", color: "var(--admin-text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          {apercu.photo_url && <img src={apercu.photo_url} alt={apercu.titre} style={{ width: "100%", borderRadius: 10, marginBottom: 12 }} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Ligne titre="Catégorie">
              {CATEGORIES.map((c) => (
                <Choix key={c} actif={apercu.categorie === c} onClick={() => ranger(apercu, { categorie: c })}>{CATEGORIE_LABELS[c]}</Choix>
              ))}
            </Ligne>
            {categorieAvecGout(apercu.categorie) && (
              <Ligne titre="Sucré ou salé">
                {GOUTS.map((g) => (
                  <Choix key={g} actif={apercu.gout === g} onClick={() => ranger(apercu, { gout: g })}>{GOUT_LABELS[g]}</Choix>
                ))}
              </Ligne>
            )}
            {apercu.categorie && (
              <Ligne titre="Calories">
                {TTL_RECETTE_CALORIES[apercu.categorie].map((k) => (
                  <Choix key={k} actif={apercu.calories === k} onClick={() => ranger(apercu, { calories: k })}>{k} kcal</Choix>
                ))}
              </Ligne>
            )}
            <button type="button" onClick={() => handleDelete(apercu)} style={{ ...btnGhost, alignSelf: "flex-start", color: "#F87171" }}>Supprimer la recette</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "var(--admin-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{titre}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Choix({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ ...btnGhost, ...(actif ? { backgroundColor: "#B22222", borderColor: "#B22222", color: "#fff" } : {}) }}>
      {children}
    </button>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "11px 16px", backgroundColor: "#B22222", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, alignSelf: "flex-start",
};
const btnGhost: React.CSSProperties = {
  padding: "7px 14px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 8, color: "var(--admin-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
