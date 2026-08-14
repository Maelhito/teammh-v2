"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PreviewBanner({ name }: { name: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function quitter() {
    setLeaving(true);
    await fetch("/api/coach/preview", { method: "DELETE" });
    router.push("/coach/clientes");
    router.refresh();
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#7C3AED",
        color: "#fff",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontFamily: "system-ui",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      <span>🔍 Aperçu — {name}</span>
      <button
        onClick={quitter}
        disabled={leaving}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: 6,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 10px",
          cursor: leaving ? "default" : "pointer",
        }}
      >
        {leaving ? "..." : "Quitter"}
      </button>
    </div>
  );
}
