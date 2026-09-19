import { getStripe } from "@/lib/stripe";
import { ttlColors } from "@/lib/ttl-theme";
import DefinirMotDePasse from "./DefinirMotDePasse";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

function Erreur({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div style={{ backgroundColor: ttlColors.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
        <h1 className="font-title" style={{ color: "#fff", fontSize: "1.4rem", letterSpacing: "1px", margin: "0 0 12px" }}>{titre}</h1>
        <p className="font-body" style={{ color: ttlColors.muted, fontSize: 14, lineHeight: 1.6 }}>{texte}</p>
      </div>
    </div>
  );
}

export default async function BienvenuePage({ searchParams }: PageProps) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return <Erreur titre="Lien invalide" texte="Ce lien de paiement est incomplet. Reprends depuis la page d'inscription." />;
  }

  const stripe = getStripe();
  if (!stripe) {
    return <Erreur titre="Paiement indisponible" texte="Réessaie dans un instant, ou contacte-nous si ça persiste." />;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    return <Erreur titre="Paiement introuvable" texte="Ce lien de paiement n'est plus valide." />;
  }

  if (session.payment_status !== "paid") {
    return (
      <Erreur
        titre="Paiement non confirmé"
        texte="Si tu viens de payer, patiente quelques secondes et recharge cette page. Sinon, reprends ton inscription."
      />
    );
  }

  const email = session.customer_details?.email ?? session.customer_email ?? "";
  const prenom = session.metadata?.prenom ?? "";

  return <DefinirMotDePasse sessionId={session_id} prenom={prenom} email={email} />;
}
