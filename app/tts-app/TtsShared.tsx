export function TtsHeader({ prenom, avatarUrl, offreLabel }: { prenom: string; avatarUrl: string | null; offreLabel: string }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #B22222 0%, #7A1515 100%)", padding: "18px 22px 26px", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center",
          backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
        }}>
          {!avatarUrl && <span style={{ fontSize: 18 }}>🔥</span>}
        </div>
      </div>
      <p className="font-body" style={{ color: "#F5F5F0", fontSize: 13, opacity: 0.85, marginTop: 14 }}>
        Bonjour, <b style={{ color: "#fff", fontWeight: 700 }}>{prenom}</b>
      </p>
      <span className="font-body" style={{
        display: "inline-block", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.25)",
        color: "#fff", fontSize: 11, letterSpacing: "1.5px", padding: "4px 10px", borderRadius: 20, marginTop: 10, fontWeight: 700,
      }}>
        {offreLabel}
      </span>
    </div>
  );
}

export function SectionTitle({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <div className="font-title" style={{
      color: "#F5F5F0", fontSize: 15, letterSpacing: "1.5px", margin: "22px 0 12px", paddingLeft: 10,
      borderLeft: "3px solid #E63946", display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      {children}
      {count && <span className="font-body" style={{ color: "#8A8078", fontSize: 11, letterSpacing: 0, fontWeight: 400 }}>{count}</span>}
    </div>
  );
}

export function SimpleCard({ icon, title, subtitle, onClick, badge, dimmed }: {
  icon: string; title: string; subtitle: string; onClick?: () => void; badge?: React.ReactNode; dimmed?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        all: "unset", boxSizing: "border-box", width: "100%", cursor: onClick ? "pointer" : "default",
        backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 16, padding: 14, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 14, opacity: dimmed ? 0.55 : 1,
      }}
    >
      <div style={{ width: 54, height: 54, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: "linear-gradient(135deg,#B22222,#5a1010)" }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <p className="font-body" style={{ color: "#fff", fontSize: 14.5, fontWeight: 600, margin: "0 0 3px" }}>{title}</p>
        <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: 0 }}>{subtitle}</p>
      </div>
      {badge}
    </Tag>
  );
}

export function VideoLibraryCard({ titre, meta, coverUrl, intensity, onClick }: {
  titre: string; meta: string; coverUrl: string | null; intensity?: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "block", width: "100%", backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      <div style={{
        height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
        background: coverUrl ? undefined : "linear-gradient(135deg,#B22222,#3a0a0a)",
      }}>
        {intensity && <span className="font-body" style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 10, letterSpacing: "0.5px" }}>{intensity}</span>}
        <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.92)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#B22222" }}>▶</div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{titre}</p>
        <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: 0 }}>{meta}</p>
      </div>
    </button>
  );
}

export function RecipeLibraryCard({ titre, meta, photoUrl, onClick }: {
  titre: string; meta: string; photoUrl: string | null; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "block", width: "100%", backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      <div style={{
        height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
        backgroundImage: photoUrl ? `url(${photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
        background: photoUrl ? undefined : "linear-gradient(135deg,#3a3a1f,#1f1f12)",
      }}>
        {!photoUrl && "🥗"}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p className="font-body" style={{ color: "#E63946", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>{meta}</p>
        <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "4px 0 0" }}>{titre}</p>
      </div>
    </button>
  );
}
