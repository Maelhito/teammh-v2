"use client";

import { useEffect, useState } from "react";
import { dateLisible, decalageLisible, formatDateDans, formatHeureDans, instantDepuis, nomLisible } from "@/lib/temps";

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

  const elle = prenomCliente?.trim() || "elle";
  const memeFuseau = fuseaux.coach === fuseaux.cliente;

  // Trois lectures du même instant : l'heure tapée, celle de la cliente, celle
  // du coach. La troisième manquait — et quand le coach tape « son heure à
  // elle », le fuseau de saisie n'est plus le sien : lui annoncer « chez toi »
  // était alors faux, et c'est ce qui rendait la grille incompréhensible.
  const heureCliente = formatHeureDans(instant, fuseaux.cliente);
  const jourCliente = formatDateDans(instant, fuseaux.cliente);
  const heureCoach = formatHeureDans(instant, fuseaux.coach);
  const jourCoach = formatDateDans(instant, fuseaux.coach);
  const saisieEstCoach = saisie === fuseaux.coach;
  const decale = heureCliente !== heureCoach || jourCliente !== jourCoach;

  const cadre: React.CSSProperties = {
    marginTop: 8, padding: "9px 11px", borderRadius: 9,
    border: `1px solid ${decale ? "#E8B4B4" : "#e8e8e8"}`,
    backgroundColor: decale ? "#FDF6F6" : "#fafafa",
    fontFamily: "system-ui", fontSize: 12, color: "#1a1a1a", lineHeight: 1.55,
  };

  return (
    <div style={cadre}>
      {memeFuseau ? (
        <div style={{ color: "#666" }}>
          {heureCliente} chez toi comme pour {elle} — même fuseau ({nomLisible(fuseaux.cliente)}).
        </div>
      ) : (
        <>
          {/* Ce que vit la cliente : c'est le rendez-vous, et c'est ce que
              montre son calendrier. */}
          <div>
            Pour {elle} : <strong style={{ color: "#B22222" }}>{dateLisible(jourCliente)} à {heureCliente}</strong> ({nomLisible(fuseaux.cliente)})
          </div>
          {/* Ce que le coach vivra, sur sa propre horloge. */}
          <div style={{ marginTop: 3 }}>
            Chez toi : <strong>{dateLisible(jourCoach)} à {heureCoach}</strong> ({nomLisible(fuseaux.coach)})
          </div>
          {jourCliente !== jourCoach && (
            <div style={{ color: "#B22222", marginTop: 3 }}>
              ⚠ Ce n&apos;est pas le même jour pour vous deux — normal, vous n&apos;êtes pas dans le même fuseau.
            </div>
          )}
          {!saisieEstCoach && (
            <div style={{ color: "#888", marginTop: 3, fontSize: 11 }}>
              Heure tapée à l&apos;heure de {nomLisible(saisie)}.
            </div>
          )}
        </>
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
