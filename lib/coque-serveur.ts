import { headers } from "next/headers";
import { estCoque } from "@/lib/coque";

/** Vrai si la page est demandée depuis l'app des stores (voir lib/coque.ts). */
export async function dansLaCoque(): Promise<boolean> {
  return estCoque((await headers()).get("user-agent"));
}
