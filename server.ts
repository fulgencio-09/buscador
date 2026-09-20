import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { localDb } from './server/database';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  const MASTER_ROUTE_CODE = '8492';

  function isAuthorized(req: express.Request): boolean {
    const code = req.headers['x-route-auth-code'] || req.body?.authCode;
    if (!code) return false;
    const clean = String(code).trim().toUpperCase();
    return clean === MASTER_ROUTE_CODE || clean === 'PDF-8492';
  }

  // API Routes
  // 1. Health and DB status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Verify route change authorization code
  app.post('/api/auth/verify-route-code', (req, res) => {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Se requiere ingresar el código.' });
    }
    const clean = String(code).trim().toUpperCase();
    if (clean === MASTER_ROUTE_CODE || clean === 'PDF-8492') {
      return res.json({ valid: true, message: 'Código de autorización válido.' });
    }
    return res.status(401).json({ valid: false, error: 'Código de autorización incorrecto.' });
  });

  app.get('/api/database/status', (req, res) => {
    try {
      const info = localDb.getDatabaseInfo();
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Routes Management API
  app.get('/api/routes', (req, res) => {
    try {
      const routes = localDb.getRoutes();
      const activeRoute = localDb.getActiveRoute();
      res.json({ routes, activeRoute });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/routes', (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(403).json({ error: 'Acceso no autorizado: se requiere el código maestro para registrar rutas.' });
      }

      const { path: routePath, name, description, isDefault, pdfCount } = req.body;
      if (!routePath || typeof routePath !== 'string') {
        return res.status(400).json({ error: 'El campo "path" es obligatorio.' });
      }

      const saved = localDb.saveRoute({
        path: routePath,
        name,
        description,
        isDefault: Boolean(isDefault),
        pdfCount: Number(pdfCount) || 0
      });

      res.status(201).json({ success: true, route: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/routes/active', (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(403).json({ error: 'Acceso no autorizado: se requiere el código maestro para cambiar la ruta predeterminada.' });
      }

      const { path: routePath } = req.body;
      if (typeof routePath !== 'string') {
        return res.status(400).json({ error: 'El campo "path" es requerido.' });
      }

      const updated = localDb.setActiveRoute(routePath);
      res.json({ success: true, activeRoute: routePath, route: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/routes/:id', (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(403).json({ error: 'Acceso no autorizado: se requiere el código maestro para eliminar rutas.' });
      }

      const { id } = req.params;
      const deleted = localDb.deleteRoute(id);
      if (deleted) {
        res.json({ success: true, message: 'Ruta eliminada correctamente de la base de datos' });
      } else {
        res.status(404).json({ error: 'Ruta no encontrada' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Shared Documents Management API
  app.get('/api/documents', (req, res) => {
    try {
      const documents = localDb.getDocuments();
      res.json({ documents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/documents', (req, res) => {
    try {
      const { name, path: docPath, folder, size, lastModified, category, summary } = req.body;
      if (!name || !docPath) {
        return res.status(400).json({ error: 'Nombre y ruta son obligatorios' });
      }

      const doc = localDb.saveDocument({
        name,
        path: docPath,
        folder: folder || 'documentos',
        size: Number(size) || 0,
        lastModified,
        category,
        summary
      });

      res.status(201).json({ success: true, document: doc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/documents/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = localDb.deleteDocument(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Documento no encontrado' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development vs static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de base de datos local y buscador PDF activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
