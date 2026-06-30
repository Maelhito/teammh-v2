"use client";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--admin-input-bg)",
  border: "1px solid var(--admin-border)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--admin-text)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--admin-card2)",
  border: "1px solid var(--admin-border)",
  borderRadius: 14,
  padding: 20,
};

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--admin-text)", margin: "0 0 4px", fontFamily: "system-ui" }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: "var(--admin-text-muted)", margin: 0, fontFamily: "system-ui" }}>{subtitle}</p>
      )}
    </div>
  );
}
