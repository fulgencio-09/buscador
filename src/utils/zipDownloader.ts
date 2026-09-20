import JSZip from 'jszip';
import { PdfItem } from '../types';

export interface ZipProgressCallback {
  (current: number, total: number, percentage: number, currentFileName: string): void;
}

export async function downloadPdfsAsZip(
  items: PdfItem[],
  options: {
    zipFileName?: string;
    preserveFolderStructure?: boolean;
    onProgress?: ZipProgressCallback;
  } = {}
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const total = items.length;
  const preserveFolders = options.preserveFolderStructure ?? true;
  const zipName = options.zipFileName || `resultados_pdf_${new Date().toISOString().slice(0, 10)}.zip`;

  // Track used names in flat mode to prevent overwriting files with identical names in different folders
  const usedNames = new Set<string>();

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (options.onProgress) {
      const pct = Math.round(((i + 1) / total) * 100);
      options.onProgress(i + 1, total, pct, item.name);
    }

    let fileData: Blob | File | undefined = item.file || item.blob;
    if (!fileData) {
      continue;
    }

    if (preserveFolders) {
      // Normalize folder path: remove leading slash
      const cleanPath = item.path.replace(/^\/+/, '');
      zip.file(cleanPath, fileData);
    } else {
      let fileName = item.name;
      if (usedNames.has(fileName)) {
        const parts = fileName.split('.');
        const ext = parts.pop() || 'pdf';
        const base = parts.join('.');
        fileName = `${base}_${i + 1}.${ext}`;
      }
      usedNames.add(fileName);
      zip.file(fileName, fileData);
    }
  }

  // Generate zip file with compression
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (options.onProgress) {
        options.onProgress(total, total, Math.round(metadata.percent), 'Generando archivo comprimido .ZIP...');
      }
    }
  );

  // Trigger download in browser
  const downloadUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 10000);
}
