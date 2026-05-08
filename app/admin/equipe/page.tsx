import TeamAdmin from "../TeamAdmin";

export const dynamic = "force-dynamic";

export default function AdminEquipePage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Organisation
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          🤝 Mon équipe
        </h1>
      </div>
      <TeamAdmin />
    </div>
  );
}
