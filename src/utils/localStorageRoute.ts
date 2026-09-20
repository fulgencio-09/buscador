import { PdfItem } from '../types';

export interface StoredLocalRoute {
  folderName: string;
  routePath: string;
  totalPdfs: number;
  savedAt: string;
  items: Array<Omit<PdfItem, 'file' | 'blob'>>;
}

const STORAGE_KEY = 'pdf_scanner_saved_local_route_v1';

/**
 * Persists the selected local folder route and its indexed files metadata
 * to the browser's localStorage so it is never lost across sessions.
 */
export function saveLocalRouteToStorage(
  folderName: string,
  items: PdfItem[],
  routePath?: string
): boolean {
  try {
    const serializableItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      path: item.path,
      folder: item.folder,
      size: item.size,
      lastModified: item.lastModified,
      origin: 'local' as const,
      summary: item.summary
    }));

    const payload: StoredLocalRoute = {
      folderName,
      routePath: routePath || folderName,
      totalPdfs: serializableItems.length,
      savedAt: new Date().toISOString(),
      items: serializableItems
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error al guardar ruta local en LocalStorage:', error);
    return false;
  }
}

/**
 * Retrieves the persisted local folder route from localStorage if available.
 */
export function getSavedLocalRouteFromStorage(): StoredLocalRoute | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.folderName === 'string' && Array.isArray(data.items)) {
      return data as StoredLocalRoute;
    }
    return null;
  } catch (error) {
    console.error('Error al leer ruta local de LocalStorage:', error);
    return null;
  }
}

/**
 * Removes the saved route from localStorage.
 */
export function clearSavedLocalRouteFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error al limpiar LocalStorage:', error);
  }
}
