import fs from 'fs';
import path from 'path';

export interface SavedRoute {
  id: string;
  path: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
  lastAccessedAt: string;
  pdfCount?: number;
}

export interface StoredDocument {
  id: string;
  name: string;
  path: string;
  folder: string;
  size: number;
  lastModified: number;
  category?: string;
  summary?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  version: number;
  activeRoute: string;
  lastUpdated: string;
  routes: SavedRoute[];
  documents: StoredDocument[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_ROUTES: SavedRoute[] = [
  {
    id: 'route-default-1',
    path: 'documentos/finanzas/2024',
    name: 'Finanzas y Facturación 2024',
    description: 'Facturas, cierres contables y presupuestos del ejercicio 2024.',
    isDefault: true,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    pdfCount: 4
  },
  {
    id: 'route-default-2',
    path: 'documentos/legal',
    name: 'Contratos y Asuntos Legales',
    description: 'Contratos vigentes, acuerdos confidenciales (NDA) y estatutos.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    pdfCount: 4
  },
  {
    id: 'route-default-3',
    path: 'documentos/recursos_humanos',
    name: 'Recursos Humanos y Nóminas',
    description: 'Nóminas mensuales por departamento y manual de políticas.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    pdfCount: 3
  },
  {
    id: 'route-default-4',
    path: 'documentos/operaciones',
    name: 'Operaciones y Proyectos Técnicos',
    description: 'Propuestas de arquitectura y manuales de procedimientos de calidad.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    pdfCount: 2
  }
];

class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadDatabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          version: parsed.version || 1,
          activeRoute: parsed.activeRoute || 'documentos/finanzas/2024',
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          routes: parsed.routes && Array.isArray(parsed.routes) ? parsed.routes : INITIAL_ROUTES,
          documents: parsed.documents && Array.isArray(parsed.documents) ? parsed.documents : []
        };
      }
    } catch (err) {
      console.error('Error al leer base de datos local, regenerando archivo:', err);
    }

    const initialDb: DatabaseSchema = {
      version: 1,
      activeRoute: 'documentos/finanzas/2024',
      lastUpdated: new Date().toISOString(),
      routes: INITIAL_ROUTES,
      documents: []
    };

    this.saveToDisk(initialDb);
    return initialDb;
  }

  private saveToDisk(dataToSave: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error al guardar en base de datos local:', err);
    }
  }

  // Routes Management
  public getRoutes(): SavedRoute[] {
    return this.data.routes;
  }

  public getActiveRoute(): string {
    return this.data.activeRoute || '';
  }

  public setActiveRoute(routePath: string): SavedRoute | null {
    this.data.activeRoute = routePath.trim();
    this.data.lastUpdated = new Date().toISOString();

    let matched: SavedRoute | null = null;
    this.data.routes = this.data.routes.map((r) => {
      const isCurrent = r.path.toLowerCase() === routePath.trim().toLowerCase();
      if (isCurrent) {
        matched = { ...r, isDefault: true, lastAccessedAt: new Date().toISOString() };
        return matched;
      }
      return { ...r, isDefault: false };
    });

    this.saveToDisk(this.data);
    return matched;
  }

  public saveRoute(route: {
    path: string;
    name?: string;
    description?: string;
    isDefault?: boolean;
    pdfCount?: number;
  }): SavedRoute {
    const cleanPath = route.path.trim().replace(/^\/+|\/+$/g, '');
    const cleanName = route.name?.trim() || cleanPath.split('/').pop() || cleanPath;

    // Check if path already exists
    const existingIndex = this.data.routes.findIndex(
      (r) => r.path.toLowerCase() === cleanPath.toLowerCase()
    );

    const now = new Date().toISOString();
    let saved: SavedRoute;

    if (existingIndex >= 0) {
      const existing = this.data.routes[existingIndex];
      saved = {
        ...existing,
        name: route.name ? cleanName : existing.name,
        description: route.description ?? existing.description,
        isDefault: route.isDefault ?? existing.isDefault,
        pdfCount: route.pdfCount ?? existing.pdfCount,
        lastAccessedAt: now
      };
      this.data.routes[existingIndex] = saved;
    } else {
      saved = {
        id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        path: cleanPath,
        name: cleanName,
        description: route.description || `Ruta indexada: ${cleanPath}`,
        isDefault: route.isDefault ?? false,
        createdAt: now,
        lastAccessedAt: now,
        pdfCount: route.pdfCount || 0
      };
      this.data.routes.unshift(saved);
    }

    if (route.isDefault) {
      this.data.activeRoute = cleanPath;
      this.data.routes = this.data.routes.map((r) => ({
        ...r,
        isDefault: r.id === saved.id
      }));
    }

    this.data.lastUpdated = now;
    this.saveToDisk(this.data);
    return saved;
  }

  public deleteRoute(id: string): boolean {
    const initialLength = this.data.routes.length;
    this.data.routes = this.data.routes.filter((r) => r.id !== id);
    if (this.data.routes.length !== initialLength) {
      this.data.lastUpdated = new Date().toISOString();
      this.saveToDisk(this.data);
      return true;
    }
    return false;
  }

  // Documents Management
  public getDocuments(): StoredDocument[] {
    return this.data.documents;
  }

  public saveDocument(doc: {
    name: string;
    path: string;
    folder: string;
    size: number;
    lastModified?: number;
    category?: string;
    summary?: string;
  }): StoredDocument {
    const now = new Date().toISOString();
    const newDoc: StoredDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: doc.name,
      path: doc.path,
      folder: doc.folder,
      size: doc.size,
      lastModified: doc.lastModified || Date.now(),
      category: doc.category,
      summary: doc.summary,
      createdAt: now
    };

    // Replace if same path exists
    const idx = this.data.documents.findIndex((d) => d.path === doc.path);
    if (idx >= 0) {
      this.data.documents[idx] = newDoc;
    } else {
      this.data.documents.unshift(newDoc);
    }

    this.data.lastUpdated = now;
    this.saveToDisk(this.data);
    return newDoc;
  }

  public deleteDocument(id: string): boolean {
    const initial = this.data.documents.length;
    this.data.documents = this.data.documents.filter((d) => d.id !== id);
    if (this.data.documents.length !== initial) {
      this.data.lastUpdated = new Date().toISOString();
      this.saveToDisk(this.data);
      return true;
    }
    return false;
  }

  public getDatabaseInfo() {
    return {
      status: 'online',
      storageFile: DB_FILE,
      routesCount: this.data.routes.length,
      activeRoute: this.data.activeRoute,
      documentsCount: this.data.documents.length,
      lastUpdated: this.data.lastUpdated
    };
  }
}

export const localDb = new LocalDatabase();
