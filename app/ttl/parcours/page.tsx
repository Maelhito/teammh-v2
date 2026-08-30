import { redirect } from "next/navigation";

/**
 * Le parcours des modules vit désormais sur l'accueil : l'onglet « Mon Parcours »
 * a disparu de la barre du bas. On garde la route pour les anciens liens.
 */
interface PageProps {
  searchParams: Promise<{ locked?: string }>;
}

export default async function TtlParcoursRedirect({ searchParams }: PageProps) {
  const { locked } = await searchParams;
  redirect(locked === "1" ? "/ttl?locked=1#parcours" : "/ttl#parcours");
}
