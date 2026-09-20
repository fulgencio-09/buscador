import { PdfItem } from '../types';

/**
 * Downloads a single PDF item directly to the user's computer.
 */
export function downloadSinglePdf(item: PdfItem): void {
  const fileData = item.file || item.blob;
  if (!fileData) return;

  const url = URL.createObjectURL(fileData);
  const link = document.createElement('a');
  link.href = url;
  link.download = item.name.endsWith('.pdf') ? item.name : `${item.name}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
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
    // 500ms delay between downloads to ensure the browser processes each download trigger
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
