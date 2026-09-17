"use client";

import { useEffect, useState } from "react";
import { cardStyle } from "../TtlShared";

function formatTaille(octets: number) {
  return octets >= 1024 * 1024 * 1024
    ? `${(octets / 1024 / 1024 / 1024).toFixed(1)} Go`
    : `${Math.max(1, Math.round(octets / 1024 / 1024))} Mo`;
}

/** Ménage des fichiers d'Alimentation que plus aucun plan ni aucune recette n'utilise. */
export default function StockageAdmin() {
  const [etat, setEtat] = useState<{ nombre: number; octets: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function analyser() {
    setEtat(null);
    fetch("/api/admin/ttl/stockage")
      .then((r) => r.json())
      .then((d) => (d.error ? setMessage(d.error) : setEtat(d)))
      .catch(() => setMessage("Analyse impossible"));
  }

  useEffect(analyser, []);

  async function nettoyer() {
    if (!etat || !confirm(`Supprimer définitivement ${etat.nombre} fichiers inutiles (${formatTaille(etat.octets)}) ?\nAucun plan ni aucune recette visible dans l'app n'est touché.`)) return;
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ttl/stockage", { method: "DELETE" });
      const d = await res.json();
      setMessage(res.ok ? `✓ ${d.nombre} fichiers supprimés, ${formatTaille(d.octets)} libérés` : d.error ?? "Erreur");
    } finally {
      setEnCours(false);
      analyser();
    }
  }

  return (
    <div style={{ ...cardStyle, marginTop: 36 }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--admin-text)", margin: "0 0 4px", fontFamily: "system-ui" }}>Espace de stockage</h2>
      <p style={{ fontSize: 12, color: "var(--admin-text-muted)", margin: "0 0 12px" }}>
        Fichiers restés en ligne après un PDF remplacé, un envoi interrompu ou une suppression. Ils ne servent plus à rien.
      </p>
      {!etat ? (
        <p style={{ fontSize: 13, color: "var(--admin-text-muted)", margin: 0 }}>Analyse…</p>
      ) : etat.nombre === 0 ? (
        <p style={{ fontSize: 13, color: "var(--admin-text)", margin: 0 }}>✓ Aucun fichier inutile.</p>
      ) : (
        <button type="button" onClick={nettoyer} disabled={enCours} style={{ padding: "9px 16px", backgroundColor: "#B22222", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: enCours ? "not-allowed" : "pointer" }}>
          {enCours ? "Suppression…" : `Supprimer ${etat.nombre} fichiers inutiles (${formatTaille(etat.octets)})`}
        </button>
      )}
      {message && <p style={{ fontSize: 12, color: "var(--admin-text-muted)", margin: "10px 0 0" }}>{message}</p>}
    </div>
  );
}
