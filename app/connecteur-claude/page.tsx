/**
 * Connecteur Claude — la page « Autoriser Claude à lire tes clientes ? ».
 *
 * Claude y envoie le coach la première fois qu'il ajoute le connecteur. Le coach
 * se connecte avec son compte TTM (s'il ne l'est pas déjà), lit ce que Claude
 * pourra voir, puis accepte. Claude ne reçoit jamais son mot de passe.
 */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { estCoachOuAdmin } from "@/lib/mcp/acces";
import { lireDemande } from "@/lib/mcp/demande";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connecter Claude · Time To Move" };

const page: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#0D0D0D",
  color: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const carte: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  backgroundColor: "#1A1A1A",
  border: "1px solid #2A2A2A",
  borderRadius: 18,
  padding: "28px 22px",
};
const bouton: React.CSSProperties = {
  width: "100%",
  padding: "14px 0",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

function Message({ titre, texte }: { titre: string; texte: string }) {
  return (
    <main style={page}>
      <div style={carte}>
        <h1 style={{ fontSize: 20, margin: "0 0 10px" }}>{titre}</h1>
        <p style={{ color: "#BBBBBB", fontSize: 15, lineHeight: 1.5, margin: 0 }}>{texte}</p>
      </div>
    </main>
  );
}

export default async function ConnecteurClaude({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lecture = lireDemande(params);
  if (!lecture.ok) return <Message titre="Connexion impossible" texte={lecture.raison} />;
  const { demande } = lecture;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string") qs.set(k, v);
    redirect(`/login?suite=${encodeURIComponent(`/connecteur-claude?${qs.toString()}`)}`);
  }

  if (!estCoachOuAdmin(user)) {
    return (
      <Message
        titre="Accès réservé à l'équipe"
        texte="Le connecteur Claude est réservé aux coachs et à l'équipe Time To Move. Ton compte n'y a pas accès."
      />
    );
  }

  const prenom = (user.user_metadata?.prenom as string | undefined) ?? user.email?.split("@")[0] ?? "";

  return (
    <main style={page}>
      <div style={carte}>
        <p style={{ color: "#888", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>
          Time To Move
        </p>
        <h1 style={{ fontSize: 22, margin: "0 0 14px", lineHeight: 1.25 }}>
          Autoriser Claude à lire tes clientes&nbsp;?
        </h1>
        <p style={{ color: "#BBBBBB", fontSize: 15, lineHeight: 1.5, margin: "0 0 16px" }}>
          {prenom ? `${prenom}, ` : ""}Claude pourra consulter, pour les clientes que tu suis&nbsp;:
        </p>
        <ul style={{ color: "#DDDDDD", fontSize: 15, lineHeight: 1.7, margin: "0 0 16px", paddingLeft: 20 }}>
          <li>leurs séances faites et leurs ressentis</li>
          <li>leurs programmes</li>
          <li>leurs mesures (poids, tours) et leurs objectifs</li>
        </ul>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.5, margin: "0 0 22px" }}>
          Lecture seule&nbsp;: Claude ne peut rien modifier ni supprimer dans l&apos;app. Connectée en tant que{" "}
          <strong style={{ color: "#BBBBBB" }}>{user.email}</strong>.
        </p>
        <form method="post" action="/api/mcp/oauth/autoriser" style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="client_id" value={demande.clientId} />
          <input type="hidden" name="redirect_uri" value={demande.redirectUri} />
          <input type="hidden" name="code_challenge" value={demande.codeChallenge} />
          <input type="hidden" name="code_challenge_method" value="S256" />
          <input type="hidden" name="response_type" value="code" />
          {demande.state !== null && <input type="hidden" name="state" value={demande.state} />}
          <button
            type="submit"
            name="decision"
            value="autoriser"
            style={{ ...bouton, border: "none", backgroundColor: "#FFFFFF", color: "#0D0D0D" }}
          >
            Autoriser
          </button>
          <button
            type="submit"
            name="decision"
            value="refuser"
            style={{ ...bouton, border: "1px solid #2A2A2A", backgroundColor: "transparent", color: "#BBBBBB" }}
          >
            Refuser
          </button>
        </form>
      </div>
    </main>
  );
}
