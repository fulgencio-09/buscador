import { PdfItem } from '../types';
import { getOrGeneratePdfBlob, triggerBlobDownload } from './pdfBlobHelper';

/**
 * Downloads a single PDF item directly to the user's computer.
 * Guaranteed to produce and download a valid PDF file.
 */
export function downloadSinglePdf(item: PdfItem): void {
  try {
    const blob = getOrGeneratePdfBlob(item);
    triggerBlobDownload(blob, item.name);
  } catch (err) {
    console.error(`Error al descargar ${item.name}:`, err);
  }
}

/**
 * Sequentially triggers download for an array of PDF files with a safe throttle
 * to prevent browser popup blockers from blocking subsequent downloads.
 */
export async function downloadSequentially(
  items: PdfItem[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<void> {
  const total = items.length;
  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(i + 1, total, item.name);
    }
    downloadSinglePdf(item);
    // Delay between downloads to allow the browser to process each download trigger
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
}
