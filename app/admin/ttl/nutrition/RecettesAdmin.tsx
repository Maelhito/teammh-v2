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

interface Brouillon {
  cle: string;
  fichier: File;
  apercu: string;
  titre: string;
  envoi: "en_cours" | "ok" | "erreur";
  photo_url?: string;
  miniature_url?: string;
  categorie: Categorie | null;
  gout: Gout | null;
  calories: number | null;
}

function estRange(b: Pick<Brouillon, "categorie" | "gout" | "calories">) {
  return b.categorie !== null && b.calories !== null && (!categorieAvecGout(b.categorie) || b.gout !== null);
}

export default function RecettesAdmin() {
  const [recettes, setRecettes] = useState<TtlRecette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [brouillons, setBrouillons] = useState<Brouillon[]>([]);
  const [notifier, setNotifier] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [filtre, setFiltre] = useState<Categorie | "toutes">("toutes");
  const [apercu, setApercu] = useState<TtlRecette | null>(null);
  const [agrandie, setAgrandie] = useState<string | null>(null);
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

  function modifierBrouillon(cle: string, changement: Partial<Brouillon>) {
    setBrouillons((prev) => prev.map((b) => (b.cle === cle ? { ...b, ...changement } : b)));
  }

  /** Les photos s'envoient dès qu'elles sont choisies ; le rangement se fait pendant ce temps. */
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setError(null);

    const nouveaux: Brouillon[] = files.map((file) => ({
      cle: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fichier: file,
      apercu: URL.createObjectURL(file),
      titre: titreDepuisFichier(file.name),
      envoi: "en_cours",
      categorie: null,
      gout: null,
      calories: null,
    }));
    setBrouillons((prev) => [...prev, ...nouveaux]);

    nouveaux.forEach(async (b) => {
      try {
        const [photo, mini] = await Promise.all([
          // La photo d'origine (souvent une capture de 2 à 3 Mo) est réduite à environ 300-500 Ko.
          miniature(b.fichier, 2000).then((blob) => uploadToTtlBucket("ttl-images", blob, `recette-${b.fichier.name.replace(/\.[^.]+$/, "")}.jpg`)),
          miniature(b.fichier).then((blob) => uploadToTtlBucket("ttl-images", blob, `recette-mini-${b.fichier.name.replace(/\.[^.]+$/, "")}.jpg`)),
        ]);
        if ("error" in photo || "error" in mini) throw new Error();
        modifierBrouillon(b.cle, { envoi: "ok", photo_url: photo.url, miniature_url: mini.url });
      } catch {
        modifierBrouillon(b.cle, { envoi: "erreur" });
      }
    });
  }

  function retirerBrouillon(b: Brouillon) {
    URL.revokeObjectURL(b.apercu);
    setBrouillons((prev) => prev.filter((x) => x.cle !== b.cle));
  }

  const prets = brouillons.filter((b) => b.envoi === "ok" && estRange(b));
  const toutPret = brouillons.length > 0 && prets.length === brouillons.length;

  async function enregistrer() {
    if (!toutPret) return;
    setEnregistrement(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ttl/recettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifier,
          recettes: brouillons.map((b) => ({
            titre: b.titre, photo_url: b.photo_url, miniature_url: b.miniature_url,
            categorie: b.categorie, gout: b.gout, calories: b.calories,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Erreur"); return; }
      setRecettes((prev) => [...d.recettes, ...prev]);
      brouillons.forEach((b) => URL.revokeObjectURL(b.apercu));
      setBrouillons([]);
    } catch {
      setError("Erreur réseau");
    } finally {
      setEnregistrement(false);
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
        Une recette = une fiche photo. Ajoute les photos, puis range chacune : catégorie, sucré ou salé, calories.
      </p>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        style={{ ...cardStyle, width: "100%", padding: 22, marginBottom: 14, border: "1px dashed var(--admin-border)", color: "var(--admin-text)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        🖼 Ajouter des photos de recettes
        <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: "var(--admin-text-muted)", marginTop: 4 }}>
          Tu peux en choisir plusieurs d&apos;un coup, puis ranger chacune en la regardant.
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />

      {brouillons.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {brouillons.map((b) => (
              <div key={b.cle} style={{ border: `1px solid ${estRange(b) ? "var(--admin-border)" : "rgba(178,34,34,0.6)"}`, borderRadius: 12, padding: 10, position: "relative" }}>
                <button type="button" onClick={() => setAgrandie(b.apercu)} style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%" }}>
                  <img src={b.apercu} alt={b.titre} style={{ width: "100%", borderRadius: 8, display: "block" }} />
                </button>
                <button type="button" onClick={() => retirerBrouillon(b)} aria-label="Retirer" style={{ position: "absolute", top: 16, right: 16, width: 26, height: 26, borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer" }}>✕</button>
                <p style={{ margin: "6px 0 10px", fontSize: 11, color: b.envoi === "erreur" ? "#F87171" : "var(--admin-text-muted)" }}>
                  {b.envoi === "en_cours" ? "Envoi de la photo…" : b.envoi === "erreur" ? "Échec de l'envoi : retire-la et réessaie" : "✓ Photo envoyée"}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Ligne titre="Catégorie">
                    {CATEGORIES.map((c) => (
                      <Choix key={c} actif={b.categorie === c} onClick={() => modifierBrouillon(b.cle, { categorie: c, gout: null, calories: null })}>{CATEGORIE_LABELS[c]}</Choix>
                    ))}
                  </Ligne>
                  {categorieAvecGout(b.categorie) && (
                    <Ligne titre="Sucré ou salé">
                      {GOUTS.map((g) => (
                        <Choix key={g} actif={b.gout === g} onClick={() => modifierBrouillon(b.cle, { gout: g })}>{GOUT_LABELS[g]}</Choix>
                      ))}
                    </Ligne>
                  )}
                  {b.categorie && (
                    <Ligne titre="Calories">
                      {TTL_RECETTE_CALORIES[b.categorie].map((k) => (
                        <Choix key={k} actif={b.calories === k} onClick={() => modifierBrouillon(b.cle, { calories: k })}>{k} kcal</Choix>
                      ))}
                    </Ligne>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--admin-text-muted)" }}>
              <input type="checkbox" checked={notifier} onChange={(e) => setNotifier(e.target.checked)} />
              Envoyer une notification aux clientes TTL (une seule pour tout le lot)
            </label>
            <button
              type="button"
              onClick={enregistrer}
              disabled={!toutPret || enregistrement}
              style={{ ...btnPrimary, alignSelf: "auto", opacity: toutPret ? 1 : 0.45, cursor: toutPret && !enregistrement ? "pointer" : "not-allowed" }}
            >
              {enregistrement
                ? "Enregistrement…"
                : toutPret
                  ? `Ajouter ${brouillons.length > 1 ? `les ${brouillons.length} recettes` : "la recette"} dans l'app`
                  : `${prets.length}/${brouillons.length} prête${prets.length > 1 ? "s" : ""} : range chaque photo`}
            </button>
          </div>
        </div>
      )}

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

      {agrandie && (
        <Modal onClose={() => setAgrandie(null)} maxWidth={1000}>
          <img src={agrandie} alt="" onClick={() => setAgrandie(null)} style={{ width: "100%", borderRadius: 10, display: "block", cursor: "zoom-out" }} />
        </Modal>
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
