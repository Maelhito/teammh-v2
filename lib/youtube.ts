/**
 * Extrait l'identifiant d'une vidéo depuis n'importe quelle forme d'adresse
 * YouTube : lien de partage (youtu.be/xxx), lien de la barre d'adresse
 * (watch?v=xxx), Short (/shorts/xxx), direct (/live/xxx) ou déjà intégré
 * (/embed/xxx).
 *
 * Sans ça, un lien copié depuis l'application YouTube mobile — qui donne
 * souvent un /shorts/ — n'était pas reconnu : la cliente tombait sur un lien
 * bleu à cliquer au lieu du lecteur.
 */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("youtu")) return null;

    const first = (value: string) => value.split("/")[0].split("?")[0] || null;

    if (u.hostname.includes("youtu.be")) return first(u.pathname.slice(1));

    const v = u.searchParams.get("v");
    if (v) return first(v);

    for (const prefix of ["/embed/", "/shorts/", "/live/", "/v/"]) {
      if (u.pathname.startsWith(prefix)) return first(u.pathname.slice(prefix.length));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Adresse du lecteur intégré. `autoplay` lance la vidéo dès l'ouverture —
 * iOS peut malgré tout exiger une pression, Apple interdisant le son
 * automatique dans un cadre intégré.
 */
export function youtubeEmbedUrl(url: string, options?: { autoplay?: boolean }): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;

  const params = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (options?.autoplay) params.set("autoplay", "1");

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
