import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Mise en page commune des pages légales (/confidentialite, /cgu). */
export default function PageLegale({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", padding: "32px 20px 64px" }}>
      <div className="font-body" style={{ maxWidth: 640, margin: "0 auto", color: "rgba(255,255,255,0.72)", fontSize: 14.5, lineHeight: 1.65 }}>
        <Link href="/login" style={{ color: "#B22222", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>‹ Retour</Link>
        <h1 className="font-title" style={{ color: "#F5F5F0", fontSize: "2rem", letterSpacing: "0.04em", lineHeight: 1.1, margin: "18px 0 6px" }}>{titre}</h1>
        <p style={{ margin: "0 0 28px", color: "rgba(255,255,255,0.4)", fontSize: 12.5 }}>
          {LEGAL.marque} · Dernière mise à jour : {LEGAL.miseAJour}
        </p>
        {children}
        <p style={{ marginTop: 36, fontSize: 13 }}>
          <Link href="/confidentialite" style={{ color: "#B22222", textDecoration: "none" }}>Politique de confidentialité</Link>
          {" · "}
          <Link href="/cgu" style={{ color: "#B22222", textDecoration: "none" }}>Conditions d&apos;utilisation</Link>
        </p>
      </div>
    </div>
  );
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ color: "#F5F5F0", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{titre}</h2>
      {children}
    </section>
  );
}

/** Qui édite l'app et comment le joindre. Les champs vides de lib/legal.ts sont omis. */
export function Contact() {
  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        {LEGAL.marque}
        {LEGAL.raisonSociale ? ` — ${LEGAL.raisonSociale}` : ""}
        {LEGAL.immatriculation ? ` (${LEGAL.immatriculation})` : ""}
        {LEGAL.adresse ? `, ${LEGAL.adresse}` : ""}.
      </p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {LEGAL.email && (
          <li>Email : <a href={`mailto:${LEGAL.email}`} style={{ color: "#B22222" }}>{LEGAL.email}</a></li>
        )}
        {LEGAL.whatsapp.map((w) => (
          <li key={w.wa}>
            WhatsApp {w.pays} : <a href={`https://wa.me/${w.wa}`} style={{ color: "#B22222" }}>{w.affiche}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Deux liens discrets vers les pages légales, à poser en bas d'un écran. */
export function LiensLegaux({ couleur = "rgba(255,255,255,0.35)" }: { couleur?: string }) {
  const style: React.CSSProperties = { color: couleur, textDecoration: "underline" };
  return (
    <p className="font-body" style={{ textAlign: "center", fontSize: 11.5, margin: "18px 0 0", color: couleur }}>
      <Link href="/confidentialite" style={style}>Confidentialité</Link>
      {" · "}
      <Link href="/cgu" style={style}>Conditions d&apos;utilisation</Link>
    </p>
  );
}
