import Link from "next/link";
import { MODULE_0_STEPS, stepCompletionSlug } from "@/lib/module-0-steps";

interface Props {
  /** slugs de complétion déjà validés (module_completions) */
  completedSlugs: string[];
}

export default function Module0Steps({ completedSlugs }: Props) {
  const done = new Set(completedSlugs);

  // Le premier point non terminé est marqué "En cours"
  const firstTodoIndex = MODULE_0_STEPS.findIndex((s) => !done.has(stepCompletionSlug(s.key)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {MODULE_0_STEPS.map((step, i) => {
        const completed = done.has(stepCompletionSlug(step.key));
        const enCours = !completed && i === firstTodoIndex;

        // Sous-titre : "Catégorie · durée · statut"
        const parts = [step.category];
        if (step.duration) parts.push(step.duration);
        if (completed) parts.push("Terminé");
        else if (enCours) parts.push("En cours");

        return (
          <Link
            key={step.key}
            href={`/modules/module-0/${step.key}`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                backgroundColor: "#101010",
                border: "1px solid #1c1c1c",
                borderRadius: 16,
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Pastille emoji */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: completed ? "rgba(34,197,94,0.14)" : "#16202E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  flexShrink: 0,
                }}
              >
                {completed ? "✅" : step.emoji}
              </div>

              {/* Titre + méta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="font-body"
                  style={{
                    fontSize: "1.02rem",
                    fontWeight: 700,
                    color: "#F5F5F0",
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {step.index}. {step.title}
                </p>
                <p
                  className="font-body"
                  style={{ fontSize: "0.8rem", color: "#6B7280", margin: "4px 0 0" }}
                >
                  {parts.join(" · ")}
                </p>
              </div>

              {/* Chevron */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4B5563"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
