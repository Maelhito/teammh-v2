export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.pathname.startsWith("/embed/")) return u.pathname.replace("/embed/", "") || null;
    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(url: string, autoplay = false): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}${autoplay ? "?autoplay=1" : ""}`;
}

export function youtubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
