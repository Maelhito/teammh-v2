"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { clientLabel, normaliser } from "@/lib/tri-clientes";

const STATUT_LABEL: Record<string, string> = { active: "Active", pause: "Pause", terminee: "Terminée" };
const STATUT_COLOR: Record<string, string> = { active: "#22C55E", pause: "#F97316", terminee: "#aaa" };

export interface ClienteCarte {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  statut: string;
  accesApp: boolean;
  dateDemarrage: string | null;
}

/**
 * Grille des clientes du coach, avec recherche.
 * La liste arrive déjà triée (alphabétique, révoquées en fin) : la recherche ne
 * fait que filtrer, elle ne réordonne rien.
 */
export default function ClientesGrid({ clients }: { clients: ClienteCarte[] }) {
  const [recherche, setRecherche] = useState("");

  const resultats = useMemo(() => {
    const q = normaliser(recherche);
    if (!q) return clients;
    // Chaque mot tapé doit se retrouver : « leau meb » trouve « Mebba Leau ».
    const mots = q.split(/\s+/);
    return clients.filter(c => {
      const cible = normaliser(`${c.prenom ?? ""} ${c.nom ?? ""} ${c.email}`);
      return mots.every(m => cible.includes(m));
    });
  }, [clients, recherche]);

  return (
    <>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 340 }}>
        <span style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 13, color: "#bbb", pointerEvents: "none",
        }}>
          🔍
        </span>
        <input
          type="search"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher une cliente…"
          aria-label="Rechercher une cliente"
          style={{
            width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9,
            border: "1px solid #e0e0e0", backgroundColor: "#fff", color: "#1a1a1a",
            fontSize: 13, fontFamily: "system-ui", outline: "none",
          }}
        />
      </div>

      {clients.length > 0 && resultats.length === 0 && (
        <p style={{ color: "#aaa", fontSize: 14, fontFamily: "system-ui" }}>
          Aucune cliente ne correspond à « {recherche} ».
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 12,
      }}>
        {resultats.map(c => {
          const isActive = c.statut === "active";
          return (
            <Link key={c.id} href={`/coach/clientes/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                aspectRatio: "1 / 1",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, textAlign: "center",
                backgroundColor: "#fff", borderRadius: 14, padding: 16,
                border: "1px solid #e8e8e8", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                cursor: "pointer", position: "relative",
              }}>
                <span style={{
                  position: "absolute", top: 10, right: 10,
                  width: 9, height: 9, borderRadius: "50%",
                  backgroundColor: isActive ? "#22C55E" : "#ccc",
                }} title={isActive ? "Active" : "Inactive"} />
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  backgroundColor: "#FEF2F2", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#B22222", fontFamily: "system-ui",
                }}>
                  {clientLabel(c).charAt(0).toUpperCase()}
                </div>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
                }}>
                  {clientLabel(c)}
                </p>
                <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>
                  {c.dateDemarrage
                    ? `Démarrage : ${new Date(c.dateDemarrage).toLocaleDateString("fr-FR")}`
                    : "Pas de date de démarrage"}
                </p>
                {/* L'accès révoqué n'a rien à voir avec le statut : une cliente
                    peut rester « active » et n'avoir plus accès à l'app. */}
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: c.accesApp ? STATUT_COLOR[c.statut] : "#B91C1C",
                  backgroundColor: c.accesApp ? `${STATUT_COLOR[c.statut]}20` : "rgba(185,28,28,0.12)",
                  padding: "2px 9px", borderRadius: 20, fontFamily: "system-ui",
                }}>
                  {c.accesApp ? (STATUT_LABEL[c.statut] ?? c.statut) : "Accès révoqué"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
