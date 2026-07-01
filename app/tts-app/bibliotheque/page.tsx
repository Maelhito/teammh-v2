import { getSportVideos, getRecettes } from "@/lib/tts-client";
import BibliothequeClient from "./BibliothequeClient";

export const dynamic = "force-dynamic";

export default async function BibliothequePage() {
  const [sportVideos, recettes] = await Promise.all([getSportVideos(), getRecettes()]);
  return <BibliothequeClient sportVideos={sportVideos} recettes={recettes} />;
}
