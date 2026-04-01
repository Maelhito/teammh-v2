import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AccesSuspenduPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user.email ?? "";

  return (
    <div
      style={{
        backgroundColor: "#0D0D0D",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>

        {/* Logo / icône */}
        <div
          style={{
            width: 64,
            height: 64,
            backgroundColor: "#1a1a1a",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            border: "1px solid #2a2a2a",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>⏸</span>
        </div>

        <h1
          className="font-title"
          style={{
            fontSize: "1.8rem",
            color: "#F5F5F0",
            letterSpacing: "0.04em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          ACCÈS SUSPENDU
        </h1>

        <div
          style={{
            backgroundColor: "#111111",
            border: "1px solid #1a1a1a",
            borderRadius: 16,
            padding: "24px 20px",
            marginBottom: 24,
          }}
        >
          <p
            className="font-body"
            style={{
              fontSize: "0.95rem",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Ton accès est temporairement suspendu.
          </p>
          <p
            className="font-body"
            style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
            }}
          >
            N&apos;hésite pas à contacter ton coach pour plus d&apos;informations.
          </p>
        </div>

        <a
          href="mailto:mael.ld@hotmail.fr"
          style={{
            display: "inline-block",
            backgroundColor: "#B22222",
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "13px 28px",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          Contacter le coach
        </a>

        <p style={{ fontSize: 12, color: "#444" }}>
          {email}
        </p>

      </div>
    </div>
  );
}
