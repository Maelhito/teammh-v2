import Link from "next/link";
import { ttlColors } from "@/lib/ttl-theme";

const PILIERS = [
  { icon: "🎬", titre: "Onboarding guidé", texte: "Des vidéos courtes pour démarrer du bon pied, dans l'ordre, à ton rythme." },
  { icon: "🏋️", titre: "Un programme sport", texte: "Des séances vidéo à suivre chez toi, qui se lancent toutes seules." },
  { icon: "🥗", titre: "Nutrition", texte: "Des plans alimentaires et des recettes classées, adaptés à ton objectif." },
  { icon: "💡", titre: "Capsules motivation", texte: "De quoi tenir dans la durée, pas juste les premières semaines." },
];

export default function VenteTtlPage() {
  return (
    <div style={{ backgroundColor: ttlColors.bg, minHeight: "100vh" }}>
      <div className="mx-auto" style={{ maxWidth: 480, padding: "48px 20px 60px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "#000", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>
            🔥
          </div>
          <h1 className="font-body" style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.08em", margin: 0 }}>
            TIME TO LIVE
          </h1>
          <p className="font-body" style={{ color: ttlColors.muted, marginTop: 10, fontSize: 15, lineHeight: 1.6 }}>
            Un accompagnement complet pour changer, pour de bon : sport, nutrition et motivation, dans une seule app.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {PILIERS.map((p) => (
            <div key={p.titre} style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{p.icon}</span>
              <div>
                <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{p.titre}</p>
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{p.texte}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: 22, textAlign: "center", marginBottom: 20 }}>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, letterSpacing: "0.05em", margin: "0 0 6px", textTransform: "uppercase" }}>
            Abonnement mensuel
          </p>
          <p className="font-body" style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, margin: 0 }}>
            6 000 <span style={{ fontSize: "1.1rem", fontWeight: 600, color: ttlColors.muted }}>XPF / mois</span>
          </p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, marginTop: 8 }}>
            Sans engagement, résiliable à tout moment depuis l&apos;app.
          </p>
        </div>

        <Link
          href="/inscription-ttl"
          className="font-body"
          style={{ display: "block", textAlign: "center", backgroundColor: ttlColors.red, color: "#FFFFFF", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", textDecoration: "none" }}
        >
          JE COMMENCE →
        </Link>

        <p className="font-body" style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 20 }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: ttlColors.redBright, textDecoration: "none" }}>Se connecter</Link>
        </p>

      </div>
    </div>
  );
}
