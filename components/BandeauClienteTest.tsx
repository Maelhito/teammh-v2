"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function BandeauClienteTest() {
  const [estTest, setEstTest] = useState(false);

  useEffect(() => {
    createSupabaseBrowserClient().auth.getUser().then(({ data: { user } }) => {
      setEstTest(typeof user?.user_metadata?.test_de === "string");
    });
  }, []);

  if (!estTest) return null;

  return (
    <div style={{
      backgroundColor: "#111", color: "#fff", padding: "calc(env(safe-area-inset-top) + 6px) 16px 6px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      fontFamily: "system-ui", fontSize: 12, fontWeight: 700,
    }}>
      <span>Tu es sur ta cliente test</span>
      <a href="/api/cliente-test/revenir" style={{
        background: "#B22222", borderRadius: 6, color: "#fff", padding: "4px 10px",
        fontSize: 11, textDecoration: "none",
      }}>
        Revenir coach
      </a>
    </div>
  );
}
