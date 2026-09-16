"use client";

/** Largeur des images de page : nette en plein écran sur téléphone, sans être trop lourde. */
const LARGEUR_PAGE = 1400;

/**
 * Découpe un PDF en une image JPEG par page, dans le navigateur.
 * Les clientes n'ont ainsi jamais de PDF à ouvrir : elles feuillettent des images.
 */
export async function pdfEnImages(
  file: File,
  onProgress: (page: number, total: number) => void,
): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const chargement = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await chargement.promise;
  const images: Blob[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: LARGEUR_PAGE / base.width });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponible");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error(`Page ${i} illisible`);
      images.push(blob);
      page.cleanup();
    }
  } finally {
    await chargement.destroy();
  }

  return images;
}
