import Link from "next/link";
import AppHeader from "./AppHeader";
import { ttlColors } from "@/lib/ttl-theme";
import TtlStreakFlame from "./TtlStreakFlame";

interface HomeProps {
  variant: "home";
  firstName: string;
  offerLabel: string;
  streak?: number;
  freezes?: number;
  objectifEmoji?: string | null;
  objectifLabel?: string | null;
}

interface PageProps {
  variant: "page";
  title: string;
  subtitle?: string;
  back?: boolean;
  backHref?: string;
}

type TtlHeaderProps = HomeProps | PageProps;

export default function TtlHeader(props: TtlHeaderProps) {
  return (
    <>
      {/* Même bandeau rouge et même logo que Time To Move */}
      <AppHeader
        back={props.variant === "page" && !!props.back}
        backHref={props.variant === "page" ? props.backHref ?? "/ttl" : undefined}
        right={
          props.variant === "page" ? (
            <Link href="/ttl/profil" style={{ color: "#fff", fontSize: 20, textDecoration: "none" }} aria-label="Profil">
              ⚙️
            </Link>
          ) : undefined
        }
      />

      <div style={{ padding: "48px 22px 6px" }}>
      {props.variant === "home" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p className="font-body" style={{ color: ttlColors.offWhite, fontSize: 13, opacity: 0.85, marginTop: 14, margin: "14px 0 0" }}>
              Bonjour, <b style={{ color: "#fff", fontWeight: 700 }}>{props.firstName}</b>
            </p>
            {!!props.streak && (
              <div
                className="font-body"
                style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 10px", marginTop: 14 }}
              >
                <TtlStreakFlame days={props.streak} />
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{props.streak} jour{props.streak > 1 ? "s" : ""}</span>
                {!!props.freezes && (
                  <span style={{ fontSize: 12, marginLeft: 2 }} title={`${props.freezes} gel${props.freezes > 1 ? "s" : ""} de streak`}>
                    ❄️{props.freezes > 1 ? `×${props.freezes}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
          <span
            className="font-body"
            style={{
              display: "inline-block",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              fontSize: 11,
              letterSpacing: "1.5px",
              padding: "4px 10px",
              borderRadius: 20,
              marginTop: 10,
              fontWeight: 700,
            }}
          >
            {props.offerLabel}
          </span>
          {!!props.objectifLabel && (
            <span
              className="font-body"
              style={{
                display: "inline-block",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 20,
                marginTop: 10,
                marginLeft: 8,
                fontWeight: 700,
              }}
            >
              {props.objectifEmoji} {props.objectifLabel}
            </span>
          )}
        </>
      ) : (
        <>
          <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginTop: 14 }}>{props.title}</p>
          {props.subtitle && (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12, marginTop: 4 }}>{props.subtitle}</p>
          )}
        </>
      )}
      </div>
    </>
  );
}
