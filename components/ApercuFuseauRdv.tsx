"use client";

import { useEffect, useState } from "react";
import { dateLisible, decalageLisible, ecartEntre, instantDepuis, nomLisible } from "@/lib/temps";

interface Props {
  clienteId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" — vide tant que le coach n'a rien tapé */
  heure: string;
  /** Fuseau dans lequel le coach déclare taper l'heure. */
  fuseauSaisie: string | null;
  onFuseauSaisieChange: (fuseau: string) => void;
  prenomCliente?: string | null;
}

/**
 * Montre au coach ce que la cliente va réellement lire.
 *
 * C'est le garde-fou de l'étape 4 : même avec un code parfait, un coach à
 * Brisbane qui pense « 9h » pense à SON 9h. Tant que l'écart n'est pas écrit
 * noir sur blanc au moment de la saisie, l'erreur reste possible — et elle
 * coûte un rendez-vous manqué à la cliente.
 */
export default function ApercuFuseauRdv({
  clienteId, date, heure, fuseauSaisie, onFuseauSaisieChange, prenomCliente,
}: Props) {
  const [fuseaux, setFuseaux] = useState<{ coach: string; cliente: string } | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    fetch(`/api/coach/clientes/${clienteId}/fuseau`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (annule) return;
        setFuseaux({ coach: d.coach, cliente: d.cliente });
        // Par défaut, le coach tape dans SON fuseau : c'est ce qu'il a en tête
        // quand il regarde son propre agenda.
        if (!fuseauSaisie) onFuseauSaisieChange(d.coach);
      })
      .catch(() => { if (!annule) setErreur(true); });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  if (erreur) {
    return (
      <p style={{ fontSize: 11, color: "#B22222", margin: "6px 0 0", fontFamily: "system-ui" }}>
        Fuseaux indisponibles — l'heure sera enregistrée dans le tien.
      </p>
    );
  }

  if (!fuseaux || !date || !heure) return null;

  const saisie = fuseauSaisie ?? fuseaux.coach;
  const instant = instantDepuis(date, heure, saisie);
  if (!instant) return null;

  const ecart = ecartEntre(instant, saisie, fuseaux.cliente);
  const elle = prenomCliente?.trim() || "elle";
  const memeFuseau = fuseaux.coach === fuseaux.cliente;

  const cadre: React.CSSProperties = {
    marginTop: 8, padding: "9px 11px", borderRadius: 9,
    border: `1px solid ${ecart ? "#E8B4B4" : "#e8e8e8"}`,
    backgroundColor: ecart ? "#FDF6F6" : "#fafafa",
    fontFamily: "system-ui", fontSize: 12, color: "#1a1a1a", lineHeight: 1.55,
  };

  return (
    <div style={cadre}>
      {ecart ? (
        <>
          <div>
            <strong>{ecart.heureAuteur}</strong> à {nomLisible(saisie)} ={" "}
            <strong style={{ color: "#B22222" }}>{ecart.heureLecteur}</strong> pour {elle} ({nomLisible(fuseaux.cliente)})
          </div>
          {!ecart.memeJour && (
            <div style={{ color: "#B22222", marginTop: 3 }}>
              ⚠ Chez {elle}, c'est le {dateLisible(ecart.jourLecteur)} — pas le même jour.
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "#666" }}>
          {heure} chez toi comme pour {elle} — même fuseau ({nomLisible(fuseaux.cliente)}).
        </div>
      )}

      {!memeFuseau && (
        <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#888" }}>J&apos;ai tapé cette heure en :</span>
          <select
            value={saisie}
            onChange={(e) => onFuseauSaisieChange(e.target.value)}
            style={{
              padding: "4px 7px", borderRadius: 7, border: "1px solid #ddd",
              backgroundColor: "#fff", fontSize: 11, color: "#1a1a1a",
              fontFamily: "system-ui", outline: "none",
            }}
          >
            <option value={fuseaux.coach}>
              mon heure — {nomLisible(fuseaux.coach)} ({decalageLisible(fuseaux.coach)})
            </option>
            <option value={fuseaux.cliente}>
              son heure à {elle} — {nomLisible(fuseaux.cliente)} ({decalageLisible(fuseaux.cliente)})
            </option>
          </select>
        </div>
      )}
    </div>
  );
}
