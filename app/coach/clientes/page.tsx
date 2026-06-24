import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = { active: "Active", pause: "Pause", terminee: "Terminée" };
const STATUT_COLOR: Record<string, string> = { active: "#22C55E", pause: "#F97316", terminee: "#aaa" };

// Coachs disponibles pour l'impersonation dev
const DEV_COACHES = [
  { label: "Toutes (admin)", ids: [] },
  { label: "Yoan (coach)", ids: ["0a511090-b833-49ac-bd31-7686efbccfef"] },
  { label: "Lea (nutrition)", ids: ["c217e865-dc10-49a0-90aa-8b618f613274"] },
  { label: "Emeline (coach)", ids: ["b7c69134-29fd-4882-afae-7e96caafa4cf"] },
  { label: "Julie (coach + nutrition)", ids: ["b9dd9b84-ee78-427f-a331-d0c3562c3144", "c357c267-f9d8-4f97-a430-d267671753fe"] },
];

function clientLabel(c: { prenom: string | null; nom: string | null; email: string }) {
  return c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email;
}

export default async function CoachClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ dev_coach?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const admin = createSupabaseAdminClient();

  const params = await searchParams;
  const isDev = process.env.NODE_ENV === "development";

  // En dev, on peut choisir le coach via ?dev_coach=INDEX
  let teamMemberIds: string[] = session?.user?.user_metadata?.team_member_ids ?? [];
  let devCoachIndex = 0;

  if (isDev) {
    const idx = parseInt(params.dev_coach ?? "0", 10);
    devCoachIndex = isNaN(idx) ? 0 : Math.min(idx, DEV_COACHES.length - 1);
    teamMemberIds = DEV_COACHES[devCoachIndex].ids;
  }

  // Filtrer les clientes
  let profiles: {
    user_id: string;
    prenom: string | null;
    nom: string | null;
    statut: string;
    coach_id: string | null;
    nutrition_id: string | null;
    date_demarrage: string | null;
  }[] = [];

  if (teamMemberIds.length > 0) {
    const orFilter = teamMemberIds
      .map(id => `coach_id.eq.${id},nutrition_id.eq.${id}`)
      .join(",");
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, prenom, nom, statut, coach_id, nutrition_id, date_demarrage")
      .or(orFilter)
      .not("role", "in", '("coach","admin","nutrition")');
    profiles = data ?? [];
  } else {
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, prenom, nom, statut, coach_id, nutrition_id, date_demarrage")
      .not("role", "in", '("coach","admin","nutrition")');
    profiles = data ?? [];
  }

  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? ""]));

  const clients = profiles.map(p => ({
    id: p.user_id,
    email: emailMap[p.user_id] ?? "",
    prenom: p.prenom,
    nom: p.nom,
    statut: p.statut as "active" | "pause" | "terminee",
    dateDemarrage: p.date_demarrage,
  }));

  return (
    <div>
      {/* Bannière impersonation dev */}
      {isDev && (
        <div style={{
          margin: "0 0 20px", padding: "10px 16px",
          backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: "#D97706", fontWeight: 700, fontFamily: "system-ui", letterSpacing: "0.08em" }}>
            🛠 DEV — Vue simulée :
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DEV_COACHES.map((coach, i) => (
              <a key={i} href={`?dev_coach=${i}`} style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, textDecoration: "none",
                fontFamily: "system-ui", fontWeight: 600,
                backgroundColor: devCoachIndex === i ? "#D97706" : "rgba(245,158,11,0.15)",
                color: devCoachIndex === i ? "#fff" : "#D97706",
                border: `1px solid ${devCoachIndex === i ? "#D97706" : "rgba(245,158,11,0.3)"}`,
              }}>
                {coach.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Coach
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
          👥 Mes clientes
        </h1>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0", fontFamily: "system-ui" }}>
          {clients.length} cliente{clients.length !== 1 ? "s" : ""} assignée{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {clients.length === 0 && (
        <p style={{ color: "#aaa", fontSize: 14, fontFamily: "system-ui" }}>Aucune cliente assignée pour le moment.</p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 12,
      }}>
        {clients.map(c => {
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
                <span style={{
                  fontSize: 10, fontWeight: 600, color: STATUT_COLOR[c.statut],
                  backgroundColor: `${STATUT_COLOR[c.statut]}20`,
                  padding: "2px 9px", borderRadius: 20, fontFamily: "system-ui",
                }}>
                  {STATUT_LABEL[c.statut] ?? c.statut}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
