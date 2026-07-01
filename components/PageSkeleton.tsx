export default function PageSkeleton() {
  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <div style={{ padding: "68px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div className="skeleton-pulse" style={{ height: 24, width: "60%", borderRadius: 6, marginBottom: 20 }} />
        <div className="skeleton-pulse" style={{ height: 100, width: "100%", borderRadius: 18, marginBottom: 12 }} />
        <div className="skeleton-pulse" style={{ height: 100, width: "100%", borderRadius: 18, marginBottom: 12 }} />
        <div className="skeleton-pulse" style={{ height: 100, width: "100%", borderRadius: 18 }} />
      </div>
    </div>
  );
}
