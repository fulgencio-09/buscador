import { SavedRoute, DatabaseStatus } from '../types';
import { getActiveAuthCode } from './auth';

const FALLBACK_KEY = 'pdf_app_saved_routes_fallback';
const ACTIVE_ROUTE_KEY = 'pdf_app_active_route_fallback';

export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const res = await fetch('/api/database/status');
    if (res.ok) {
      const data = await res.json();
      return {
        status: 'online',
        storageFile: data.storageFile,
        routesCount: data.routesCount,
        activeRoute: data.activeRoute,
        documentsCount: data.documentsCount,
        lastUpdated: data.lastUpdated
      };
    }
  } catch (err) {
    console.warn('Servidor de base de datos no accesible vía API, usando caché local:', err);
  }

  // Local fallback if server API is still initializing
  const localRoutes = getLocalFallbackRoutes();
  const localActive = localStorage.getItem(ACTIVE_ROUTE_KEY) || 'documentos/finanzas/2024';
  return {
    status: 'offline',
    routesCount: localRoutes.length,
    activeRoute: localActive,
    documentsCount: 0,
    lastUpdated: new Date().toISOString()
  };
}

export async function fetchSavedRoutes(): Promise<{ routes: SavedRoute[]; activeRoute: string }> {
  try {
    const res = await fetch('/api/routes');
    if (res.ok) {
      const data = await res.json();
      // Keep local storage synchronized as backup
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(data.routes));
      if (data.activeRoute) {
        localStorage.setItem(ACTIVE_ROUTE_KEY, data.activeRoute);
      }
      return {
        routes: data.routes || [],
        activeRoute: data.activeRoute || ''
      };
    }
  } catch (err) {
    console.warn('Error al consultar rutas de base de datos:', err);
  }

  // Fallback to local storage
  return {
    routes: getLocalFallbackRoutes(),
    activeRoute: localStorage.getItem(ACTIVE_ROUTE_KEY) || 'documentos/finanzas/2024'
  };
}

export async function saveRouteToDatabase(payload: {
  path: string;
  name?: string;
  description?: string;
  isDefault?: boolean;
  pdfCount?: number;
}): Promise<SavedRoute> {
  const authCode = getActiveAuthCode() || '';
  try {
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-route-auth-code': authCode
      },
      body: JSON.stringify({ ...payload, authCode })
    });

    if (res.ok) {
      const data = await res.json();
      return data.route;
    }
  } catch (err) {
    console.warn('Error al guardar ruta en base de datos del servidor:', err);
  }

  // Fallback
  const newRoute: SavedRoute = {
    id: `local-fb-${Date.now()}`,
    path: payload.path,
    name: payload.name || payload.path,
    description: payload.description || '',
    isDefault: Boolean(payload.isDefault),
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    pdfCount: payload.pdfCount || 0
  };
  const list = getLocalFallbackRoutes();
  list.unshift(newRoute);
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
  if (payload.isDefault) {
    localStorage.setItem(ACTIVE_ROUTE_KEY, payload.path);
  }
  return newRoute;
}

export async function setActiveRouteInDatabase(path: string): Promise<boolean> {
  const authCode = getActiveAuthCode() || '';
  try {
    const res = await fetch('/api/routes/active', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-route-auth-code': authCode
      },
      body: JSON.stringify({ path, authCode })
    });
    if (res.ok) {
      localStorage.setItem(ACTIVE_ROUTE_KEY, path);
      return true;
    }
  } catch (err) {
    console.warn('Error al actualizar ruta activa en base de datos:', err);
  }

  localStorage.setItem(ACTIVE_ROUTE_KEY, path);
  return true;
}

export async function deleteRouteFromDatabase(id: string): Promise<boolean> {
  const authCode = getActiveAuthCode() || '';
  try {
    const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-route-auth-code': authCode
      }
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('Error al eliminar ruta en base de datos:', err);
  }

  const list = getLocalFallbackRoutes().filter((r) => r.id !== id);
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
  return true;
}

function getLocalFallbackRoutes(): SavedRoute[] {
  try {
    const cached = localStorage.getItem(FALLBACK_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'fb-1',
      path: 'documentos/finanzas/2024',
      name: 'Finanzas y Facturación 2024',
      description: 'Facturas y cierres contables',
      isDefault: true,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      pdfCount: 4
    }
  ];
}
