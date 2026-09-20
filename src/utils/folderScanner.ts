import { PdfItem, SearchFilter, MatchMode } from '../types';

/**
 * Parses files uploaded via HTML folder input (webkitdirectory) or dropped folders.
 */
export function parseLocalFolderFiles(files: FileList | File[]): PdfItem[] {
  const result: PdfItem[] = [];
  const fileArray = Array.from(files);

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    // Check if it's a PDF
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/pdf';

    if (!isPdf) continue;

    // webkitRelativePath gives e.g. "MiCarpeta/Subcarpeta/documento.pdf"
    const relativePath = file.webkitRelativePath || file.name;
    const pathParts = relativePath.split('/');
    const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Raíz';

    result.push({
      id: `local-${i}-${file.name}-${file.lastModified}`,
      name: file.name,
      path: relativePath,
      folder,
      size: file.size,
      lastModified: file.lastModified,
      origin: 'local',
      file
    });
  }

  return result;
}

/**
 * Traverses DataTransferItemList recursively when a folder is dragged and dropped.
 */
export async function traverseDataTransferItems(items: DataTransferItemList): Promise<PdfItem[]> {
  const pdfItems: PdfItem[] = [];

  // Helper to read entries recursively
  async function readEntry(entry: any, currentPath: string): Promise<void> {
    if (entry.isFile) {
      if (entry.name.toLowerCase().endsWith('.pdf')) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            const relativePath = currentPath ? `${currentPath}/${file.name}` : file.name;
            const pathParts = relativePath.split('/');
            const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Raíz';

            pdfItems.push({
              id: `drag-${pdfItems.length}-${file.name}-${file.lastModified}`,
              name: file.name,
              path: relativePath,
              folder,
              size: file.size,
              lastModified: file.lastModified,
              origin: 'local',
              file
            });
            resolve();
          }, () => resolve());
        });
      }
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = [];

      const readEntries = async (): Promise<void> => {
        return new Promise((resolve) => {
          dirReader.readEntries(async (results: any[]) => {
            if (!results.length) {
              resolve();
            } else {
              entries.push(...results);
              await readEntries();
              resolve();
            }
          }, () => resolve());
        });
      };

      await readEntries();
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      for (const child of entries) {
        await readEntry(child, nextPath);
      }
    }
  }

  const entriesToProcess: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry) {
        entriesToProcess.push(entry);
      } else {
        const file = item.getAsFile();
        if (file && file.name.toLowerCase().endsWith('.pdf')) {
          pdfItems.push({
            id: `drag-file-${i}-${file.name}`,
            name: file.name,
            path: file.name,
            folder: 'Raíz',
            size: file.size,
            lastModified: file.lastModified,
            origin: 'local',
            file
          });
        }
      }
    }
  }

  for (const entry of entriesToProcess) {
    await readEntry(entry, '');
  }

  return pdfItems;
}

/**
 * Determines whether a file name satisfies the query under the specified match mode.
 */
export function checkNameMatch(
  fileName: string,
  query: string,
  mode: MatchMode,
  caseSensitive: boolean
): boolean {
  if (!query.trim()) return true;

  // We can compare against the full name or the name without .pdf extension
  const target = caseSensitive ? fileName : fileName.toLowerCase();
  const search = caseSensitive ? query.trim() : query.trim().toLowerCase();

  // Also test base name without .pdf extension for convenience
  const baseName = target.endsWith('.pdf') ? target.slice(0, -4) : target;

  switch (mode) {
    case 'contains':
      return target.includes(search) || baseName.includes(search);
    case 'starts_with':
      return target.startsWith(search) || baseName.startsWith(search);
    case 'ends_with':
      return baseName.endsWith(search) || target.endsWith(search);
    case 'exact':
      return target === search || baseName === search || target === `${search}.pdf`;
    default:
      return target.includes(search);
  }
}

/**
 * Filters a collection of PdfItems against search filters.
 */
export function filterPdfItems(items: PdfItem[], filter: SearchFilter): PdfItem[] {
  return items.filter((item) => {
    // 1. Path prefix filter (if provided)
    if (filter.pathPrefix.trim()) {
      const targetPath = filter.caseSensitive ? item.path : item.path.toLowerCase();
      const prefix = filter.caseSensitive
        ? filter.pathPrefix.trim()
        : filter.pathPrefix.trim().toLowerCase();

      // Normalize slashes
      const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
      const cleanTarget = targetPath.replace(/^\/+/, '');

      if (!cleanTarget.includes(cleanPrefix)) {
        return false;
      }
    }

    // 2. Subfolder restriction (if includeSubfolders is false, only root level)
    if (!filter.includeSubfolders) {
      const parts = item.path.split('/').filter(Boolean);
      // If there is more than 1 segment (i.e. folder/file.pdf), it is in a subfolder
      if (parts.length > 2) {
        return false;
      }
    }

    // 3. Name or partial name match
    return checkNameMatch(item.name, filter.query, filter.matchMode, filter.caseSensitive);
  });
}

/**
 * Formats file size in KB or MB cleanly.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Formats timestamp to readable date string.
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}
