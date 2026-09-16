"use client";

/** Largeur des images de page : nette en plein écran sur téléphone, sans être trop lourde. */
const LARGEUR_PAGE = 1400;
/** Largeur des miniatures affichées dans l'éventail. */
const LARGEUR_MINIATURE = 520;

export interface PageImages {
  grande: Blob;
  miniature: Blob;
}

function versJpeg(canvas: HTMLCanvasElement, page: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Page ${page} illisible`))), "image/jpeg", 0.85),
  );
}

/**
 * Découpe un PDF en images JPEG (une grande et une miniature par page), dans le navigateur.
 * Les clientes n'ont ainsi jamais de PDF à ouvrir : elles feuillettent des images.
 */
export async function pdfEnImages(
  file: File,
  onProgress: (page: number, total: number) => void,
): Promise<PageImages[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const chargement = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await chargement.promise;
  const images: PageImages[] = [];

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

      const mini = document.createElement("canvas");
      mini.width = LARGEUR_MINIATURE;
      mini.height = Math.round(canvas.height * (LARGEUR_MINIATURE / canvas.width));
      const miniCtx = mini.getContext("2d");
      if (!miniCtx) throw new Error("Canvas indisponible");
      miniCtx.imageSmoothingQuality = "high";
      miniCtx.drawImage(canvas, 0, 0, mini.width, mini.height);

      images.push({ grande: await versJpeg(canvas, i), miniature: await versJpeg(mini, i) });
      page.cleanup();
    }
  } finally {
    await chargement.destroy();
  }

  return images;
}
