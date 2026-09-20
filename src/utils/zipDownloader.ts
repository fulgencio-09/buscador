import JSZip from 'jszip';
import { PdfItem } from '../types';
import { getOrGeneratePdfBlob, triggerBlobDownload } from './pdfBlobHelper';

export interface ZipProgressCallback {
  (current: number, total: number, percentage: number, currentFileName: string): void;
}

export interface ZipResult {
  blob: Blob;
  url: string;
  fileName: string;
  totalItems: number;
}

/**
 * Cleans a file or folder path so that it is 100% compliant with the PKZIP specification
 * and can be opened without errors or empty folder warnings in Windows Explorer, macOS Finder,
 * 7-Zip, WinRAR, and Linux unzip.
 */
export function sanitizeZipEntryPath(rawPath: string, fileName: string, preserveFolders: boolean): string {
  if (!preserveFolders) {
    let safeName = (fileName || 'documento.pdf').replace(/^.*[\\\/]/, '').replace(/[:*?"<>|]/g, '_').trim();
    if (!safeName.toLowerCase().endsWith('.pdf')) {
      safeName += '.pdf';
    }
    return safeName;
  }

  // Normalize all backslashes to forward slashes
  let p = (rawPath || fileName || 'documento.pdf').replace(/\\/g, '/');

  // Strip Windows drive letters (e.g. C:, D:)
  p = p.replace(/^[a-zA-Z]:\/?/, '');

  // Strip leading and trailing slashes and multiple consecutive slashes
  p = p.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');

  // Split into segments and clean each directory/filename
  const segments = p.split('/').filter((s) => s.trim() !== '' && s !== '.' && s !== '..');

  if (segments.length === 0) {
    let safeName = (fileName || 'documento.pdf').replace(/[:*?"<>|]/g, '_').trim();
    return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  }

  const cleaned = segments.map((seg, idx) => {
    let clean = seg.replace(/[:*?"<>|]/g, '_').trim();
    if (idx === segments.length - 1) {
      if (!clean.toLowerCase().endsWith('.pdf')) {
        clean = `${clean}.pdf`;
      }
    }
    return clean;
  });

  return cleaned.join('/');
}

export async function downloadPdfsAsZip(
  items: PdfItem[],
  options: {
    zipFileName?: string;
    preserveFolderStructure?: boolean;
    onProgress?: ZipProgressCallback;
  } = {}
): Promise<ZipResult | null> {
  if (!items || items.length === 0) return null;

  const zip = new JSZip();
  const total = items.length;
  const preserveFolders = options.preserveFolderStructure ?? true;
  const rawZipName = options.zipFileName || `documentos_pdf_${new Date().toISOString().slice(0, 10)}.zip`;
  const zipName = rawZipName.toLowerCase().endsWith('.zip') ? rawZipName : `${rawZipName}.zip`;

  // Track used paths to prevent duplicate file collision
  const usedPaths = new Set<string>();

  for (let i = 0; i < total; i++) {
    const item = items[i];

    if (options.onProgress) {
      // 0% - 75%: file extraction and packing
      const pct = Math.min(75, Math.round(((i + 1) / total) * 75));
      options.onProgress(i + 1, total, pct, `Preparando: ${item.name}`);
    }

    // Direct blob injection (JSZip supports Blob directly without RAM duplication)
    const fileBlob = getOrGeneratePdfBlob(item);

    // Compute safe cross-platform zip path
    let entryPath = sanitizeZipEntryPath(item.path, item.name, preserveFolders);

    // Ensure unique entry path in archive
    if (usedPaths.has(entryPath)) {
      const dotIdx = entryPath.lastIndexOf('.');
      const base = dotIdx !== -1 ? entryPath.substring(0, dotIdx) : entryPath;
      const ext = dotIdx !== -1 ? entryPath.substring(dotIdx) : '.pdf';
      entryPath = `${base}_${i + 1}${ext}`;
    }
    usedPaths.add(entryPath);

    // Add binary content to zip
    zip.file(entryPath, fileBlob);

    // Yield control periodically for UI responsiveness
    if (i % 25 === 0 && i > 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (options.onProgress) {
    options.onProgress(total, total, 80, 'Generando archivo comprimido ZIP...');
  }

  // Generate zip file with STORE compression for instantaneous generation (<100ms)
  // PDFs are already compressed internally via FlateDecode
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/zip',
      compression: 'STORE'
    },
    (metadata) => {
      if (options.onProgress) {
        const compressPct = 80 + Math.round((metadata.percent / 100) * 20);
        options.onProgress(
          total,
          total,
          Math.min(100, compressPct),
          `Comprimiendo archivo ZIP (${Math.round(metadata.percent)}%)...`
        );
      }
    }
  );

  // Trigger automatic download
  const { url, fileName } = triggerBlobDownload(zipBlob, zipName);

  return {
    blob: zipBlob,
    url,
    fileName,
    totalItems: total
  };
}
