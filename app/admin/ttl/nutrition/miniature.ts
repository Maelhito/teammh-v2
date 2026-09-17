"use client";

/** Réduit une image dans le navigateur (JPEG), pour les vignettes de l'app cliente. */
export async function miniature(file: File, largeur = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const echelle = Math.min(1, largeur / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * echelle);
    canvas.height = Math.round(bitmap.height * echelle);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    // Fond blanc : une image PNG transparente deviendrait noire en JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image illisible"))), "image/jpeg", 0.85),
    );
  } finally {
    bitmap.close();
  }
}
