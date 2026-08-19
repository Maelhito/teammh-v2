import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { clientLabel, trierClientesAlpha } from "@/lib/tri-clientes";
import ClientesGrid from "./ClientesGrid";

export const dynamic = "force-dynamic";

// Coachs disponibles pour l'impersonation dev
const DEV_COACHES = [
  { label: "Toutes (admin)", ids: [] },
  { label: "Yoan (coach)", ids: ["0a511090-b833-49ac-bd31-7686efbccfef"] },
  { label: "Lea (nutrition)", ids: ["c217e865-dc10-49a0-90aa-8b618f613274"] },
  { label: "Emeline (coach)", ids: ["b7c69134-29fd-4882-afae-7e96caafa4cf"] },
  { label: "Julie (coach + nutrition)", ids: ["b9dd9b84-ee78-427f-a331-d0c3562c3144", "c357c267-f9d8-4f97-a430-d267671753fe"] },
];

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
    acces_app: boolean | null;
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
      .select("user_id, prenom, nom, statut, acces_app, coach_id, nutrition_id, date_demarrage")
      .or(orFilter)
      .not("role", "in", '("coach","admin","nutrition")');
    profiles = data ?? [];
  } else {
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, prenom, nom, statut, acces_app, coach_id, nutrition_id, date_demarrage")
      .not("role", "in", '("coach","admin","nutrition")');
    profiles = data ?? [];
  }

  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? ""]));

  const createdMap = Object.fromEntries(authUsers.map(u => [u.id, u.created_at ?? null]));

  // Ordre alphabétique, avec les clientes révoquées reléguées en fin de liste
  // (voir lib/tri-clientes).
  const clients = trierClientesAlpha(
    profiles.map(p => ({
      id: p.user_id,
      email: emailMap[p.user_id] ?? "",
      prenom: p.prenom,
      nom: p.nom,
      statut: p.statut as "active" | "pause" | "terminee",
      // null = jamais renseigné = accès autorisé (même défaut que l'API admin)
      acces_app: p.acces_app,
      accesApp: p.acces_app !== false,
      date_demarrage: p.date_demarrage,
      created_at: createdMap[p.user_id] ?? null,
      dateDemarrage: p.date_demarrage,
    })),
    clientLabel
  );

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

      <ClientesGrid clients={clients} />
    </div>
  );
}
