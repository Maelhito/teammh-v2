"use client";

import type { PDFPageProxy } from "pdfjs-dist";

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
 * Safari ne sait pas parcourir un flux avec « for await … of » : il lui manque
 * ReadableStream[Symbol.asyncIterator], sur lequel pdf.js s'appuie pour lire le texte
 * des pages. On le lui ajoute, sinon la lecture casse dès la page 1.
 */
function comblerSafari() {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream & { [Symbol.asyncIterator]?: unknown };
  if (proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = function (this: ReadableStream) {
    const lecteur = this.getReader();
    return {
      next: () => lecteur.read(),
      return: async (valeur?: unknown) => {
        await lecteur.cancel(valeur);
        return { done: true, value: valeur };
      },
      [Symbol.asyncIterator]() { return this; },
    };
  };
}

/** Charge pdf.js et son worker. */
export async function chargerPdfjs() {
  comblerSafari();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

/** Une page de PDF en deux images JPEG : une grande et une miniature. */
export async function pageEnImages(
  page: PDFPageProxy,
  largeurGrande = LARGEUR_PAGE,
  largeurMini = LARGEUR_MINIATURE,
): Promise<PageImages> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: largeurGrande / base.width });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const mini = document.createElement("canvas");
  mini.width = largeurMini;
  mini.height = Math.round(canvas.height * (largeurMini / canvas.width));
  const miniCtx = mini.getContext("2d");
  if (!miniCtx) throw new Error("Canvas indisponible");
  miniCtx.imageSmoothingQuality = "high";
  miniCtx.drawImage(canvas, 0, 0, mini.width, mini.height);

  return { grande: await versJpeg(canvas, page.pageNumber), miniature: await versJpeg(mini, page.pageNumber) };
}

/**
 * Découpe un PDF en images JPEG (une grande et une miniature par page), dans le navigateur.
 * Les clientes n'ont ainsi jamais de PDF à ouvrir : elles feuillettent des images.
 */
export async function pdfEnImages(
  file: File,
  onProgress: (page: number, total: number) => void,
): Promise<PageImages[]> {
  const pdfjs = await chargerPdfjs();
  const chargement = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await chargement.promise;
  const images: PageImages[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress(i, pdf.numPages);
      const page = await pdf.getPage(i);
      images.push(await pageEnImages(page));
      page.cleanup();
    }
  } finally {
    await chargement.destroy();
  }

  return images;
}
