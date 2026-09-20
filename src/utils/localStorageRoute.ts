import { PdfItem } from '../types';

export interface StoredLocalRoute {
  folderName: string;
  routePath: string;
  totalPdfs: number;
  savedAt: string;
  items: Array<Omit<PdfItem, 'file' | 'blob'>>;
}

const STORAGE_KEY_META = 'pdf_scanner_saved_local_route_meta_v2';
const STORAGE_KEY_LEGACY = 'pdf_scanner_saved_local_route_v1';
const IDB_NAME = 'pdf_folder_scanner_db';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'routes_and_items';

/**
 * Helper to open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB no está disponible'));
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves large volume routes using IndexedDB with localStorage metadata backup.
 * Supports batching and progress reporting for large datasets.
 */
export async function saveLocalRouteAsync(
  folderName: string,
  items: PdfItem[],
  routePath?: string,
  onProgress?: (progressPercent: number, status: string) => void
): Promise<boolean> {
  const path = routePath || folderName;
  const now = new Date().toISOString();

  // Save metadata to localStorage first for instantaneous availability
  try {
    const meta = {
      folderName,
      routePath: path,
      totalPdfs: items.length,
      savedAt: now,
      engine: 'indexeddb'
    };
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
  } catch (err) {
    console.warn('Advertencia al escribir metadatos en localStorage:', err);
  }

  // If item list is small (< 300), also write to legacy localStorage key for backup
  if (items.length <= 300) {
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

      localStorage.setItem(
        STORAGE_KEY_LEGACY,
        JSON.stringify({
          folderName,
          routePath: path,
          totalPdfs: serializableItems.length,
          savedAt: now,
          items: serializableItems
        })
      );
    } catch {
      // Ignore quota exceeded for legacy localStorage
    }
  }

  // Persist full dataset to IndexedDB (handles tens of thousands of records smoothly)
  try {
    if (onProgress) onProgress(10, 'Iniciando almacenamiento persistente...');
    const db = await openDatabase();

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

    const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);

    const payload: StoredLocalRoute & { id: string } = {
      id: 'active_local_route',
      folderName,
      routePath: path,
      totalPdfs: serializableItems.length,
      savedAt: now,
      items: serializableItems
    };

    if (onProgress) onProgress(50, 'Escribiendo registros en base de datos local...');

    await new Promise<void>((resolve, reject) => {
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (onProgress) onProgress(100, 'Almacenamiento completado con éxito.');
    return true;
  } catch (error) {
    console.error('Error al guardar en IndexedDB, intentando fallback de localStorage:', error);
    return saveLocalRouteToStorage(folderName, items, routePath);
  }
}

/**
 * Loads the saved route from IndexedDB (or fallback to localStorage).
 */
export async function loadLocalRouteAsync(): Promise<StoredLocalRoute | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IDB_STORE_NAME);

    const record = await new Promise<any>((resolve, reject) => {
      const req = store.get('active_local_route');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (record && record.folderName && Array.isArray(record.items)) {
      return record as StoredLocalRoute;
    }
  } catch (err) {
    console.warn('No se pudo cargar desde IndexedDB, intentando localStorage:', err);
  }

  // Fallback to localStorage
  return getSavedLocalRouteFromStorage();
}

/**
 * Synchronous legacy save method (compatible with existing calls).
 */
export function saveLocalRouteToStorage(
  folderName: string,
  items: PdfItem[],
  routePath?: string
): boolean {
  // Fire async save in background
  saveLocalRouteAsync(folderName, items, routePath).catch((err) =>
    console.error('Async IndexedDB save failed:', err)
  );

  try {
    const serializableItems = items.slice(0, 1000).map((item) => ({
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
      totalPdfs: items.length,
      savedAt: new Date().toISOString(),
      items: serializableItems
    };

    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error en saveLocalRouteToStorage:', error);
    return false;
  }
}

/**
 * Synchronous retrieve method from localStorage.
 */
export function getSavedLocalRouteFromStorage(): StoredLocalRoute | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) {
      // Check metadata
      const metaRaw = localStorage.getItem(STORAGE_KEY_META);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        return {
          folderName: meta.folderName,
          routePath: meta.routePath,
          totalPdfs: meta.totalPdfs,
          savedAt: meta.savedAt,
          items: []
        };
      }
      return null;
    }
    const data = JSON.parse(raw);
    if (data && typeof data.folderName === 'string') {
      return data as StoredLocalRoute;
    }
    return null;
  } catch (error) {
    console.error('Error al leer de LocalStorage:', error);
    return null;
  }
}

/**
 * Clears saved local route from both IndexedDB and localStorage.
 */
export async function clearSavedLocalRouteFromStorage(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    localStorage.removeItem(STORAGE_KEY_META);
    const db = await openDatabase();
    const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
    transaction.objectStore(IDB_STORE_NAME).delete('active_local_route');
  } catch (error) {
    console.error('Error al limpiar almacenamiento:', error);
  }
}
