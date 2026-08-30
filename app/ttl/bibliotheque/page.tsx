import { redirect } from "next/navigation";

/**
 * La Bibliothèque a été scindée en deux onglets : Sport et Alimentation.
 * Cette route ne sert plus qu'à rattraper les anciens liens — notamment les
 * notifications push déjà envoyées, qui pointent encore vers ?tab=...
 */
interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TtlBibliothequeRedirect({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  redirect(tab === "recettes" ? "/ttl/alimentation" : tab === "capsules" ? "/ttl" : "/ttl/sport");
}
