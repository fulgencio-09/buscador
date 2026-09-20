import React, { useState } from 'react';
import {
  Database,
  Star,
  Trash2,
  CheckCircle2,
  FolderOpen,
  Plus,
  Radio,
  RefreshCw,
  MonitorCheck,
  Share2,
  Lock,
  Unlock
} from 'lucide-react';
import { SavedRoute, DatabaseStatus } from '../types';

interface SavedRoutesManagerProps {
  savedRoutes: SavedRoute[];
  activeRoute: string;
  databaseStatus: DatabaseStatus;
  currentSearchPath: string;
  isRouteUnlocked: boolean;
  onRequestUnlockRoute: (actionDescription?: string, onAuthorized?: () => void) => void;
  onLockRoute: () => void;
  onSelectRoute: (path: string) => void;
  onSetDefaultRoute: (path: string) => void;
  onSaveCurrentPath: (path: string, name?: string, description?: string) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
  onRefreshDatabase: () => void;
}

export const SavedRoutesManager: React.FC<SavedRoutesManagerProps> = ({
  savedRoutes,
  activeRoute,
  databaseStatus,
  currentSearchPath,
  isRouteUnlocked,
  onRequestUnlockRoute,
  onLockRoute,
  onSelectRoute,
  onSetDefaultRoute,
  onSaveCurrentPath,
  onDeleteRoute,
  onRefreshDatabase
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleQuickSaveCurrent = async () => {
    if (!currentSearchPath.trim()) return;

    if (!isRouteUnlocked) {
      onRequestUnlockRoute('guardar esta ruta en la base de datos', handleQuickSaveCurrent);
      return;
    }

    setIsSaving(true);
    try {
      const defaultName = currentSearchPath.split('/').filter(Boolean).pop() || currentSearchPath;
      await onSaveCurrentPath(
        currentSearchPath,
        `Carpeta: ${defaultName}`,
        'Ruta guardada para acceso desde cualquier PC'
      );
      setSaveSuccessMsg('¡Ruta guardada en la base de datos para todas las PCs!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    if (!isRouteUnlocked) {
      onRequestUnlockRoute('registrar esta nueva ruta en la base de datos', () => {
        handleCustomSubmit(e);
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveCurrentPath(newPath.trim(), newName.trim(), newDescription.trim());
      setNewPath('');
      setNewName('');
      setNewDescription('');
      setIsAddingNew(false);
      setSaveSuccessMsg('Nueva ruta registrada con éxito');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewClick = () => {
    if (!isRouteUnlocked) {
      onRequestUnlockRoute('registrar una nueva ruta en la base de datos', () => {
        setIsAddingNew(true);
      });
    } else {
      setIsAddingNew(!isAddingNew);
    }
  };

  const handleSelectRouteWithAuth = (path: string) => {
    if (!isRouteUnlocked) {
      onRequestUnlockRoute(`cargar la ruta "${path}"`, () => {
        onSelectRoute(path);
      });
    } else {
      onSelectRoute(path);
    }
  };

  const handleSetDefaultWithAuth = (path: string) => {
    if (!isRouteUnlocked) {
      onRequestUnlockRoute(`establecer "${path}" como ruta predeterminada para todas las PCs`, () => {
        onSetDefaultRoute(path);
      });
    } else {
      onSetDefaultRoute(path);
    }
  };

  const handleDeleteWithAuth = (route: SavedRoute) => {
    if (!isRouteUnlocked) {
      onRequestUnlockRoute(`eliminar la ruta "${route.name}" de la base de datos`, () => {
        onDeleteRoute(route.id);
      });
    } else {
      onDeleteRoute(route.id);
    }
  };

  const isCurrentPathAlreadySaved = savedRoutes.some(
    (r) => r.path.toLowerCase() === currentSearchPath.trim().toLowerCase()
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      {/* Header with connection status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Base de Datos Local (Sincronizada entre PCs)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {databaseStatus.status === 'online' ? 'Base de Datos Activa' : 'Modo Local'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Las rutas guardadas aquí se conservan en el servidor local. Solo tú puedes cambiarlas mediante tu código de seguridad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefreshDatabase}
            title="Sincronizar con base de datos"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleAddNewClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
          >
            {isRouteUnlocked ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
            <span>Nueva Ruta</span>
          </button>
        </div>
      </div>

      {/* Security Status Banner */}
      {!isRouteUnlocked ? (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Rutas Protegidas:</strong> Para cambiar, cargar o guardar rutas se requiere tu código de autorización.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRequestUnlockRoute('gestionar y cambiar las rutas')}
            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition-colors shrink-0 text-xs shadow-xs"
          >
            <Lock className="w-3 h-3" />
            <span>Desbloquear con código</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Modo Administrador Autorizado:</strong> Tienes permiso activo para cambiar, guardar y gestionar las rutas.
            </span>
          </div>
          <button
            type="button"
            onClick={onLockRoute}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md transition-colors shrink-0 text-xs"
          >
            Bloquear de nuevo
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Quick Action: Save current path if not saved yet */}
      {currentSearchPath.trim() && !isCurrentPathAlreadySaved && (
        <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-700">Ruta actual no guardada en la base de datos: </span>
              <span className="font-mono font-bold text-slate-900">{currentSearchPath}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleQuickSaveCurrent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shrink-0 shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Guardar ruta en la base de datos</span>
          </button>
        </div>
      )}

      {/* Add Custom Route Form */}
      {isAddingNew && (
        <form onSubmit={handleCustomSubmit} className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Registrar una nueva ruta en la base de datos local</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Ruta de la carpeta (ej: documentos/finanzas/2024 o /compartido/pdf) *
              </label>
              <input
                type="text"
                required
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="documentos/mi_carpeta"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Nombre descriptivo (etiqueta para reconocerla)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Facturas Proveedores 2024"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Nota o descripción (opcional)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Contiene archivos escaneados del departamento..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1 rounded-md text-slate-600 hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              Guardar en Base de Datos
            </button>
          </div>
        </form>
      )}

      {/* List of Saved Routes in Database */}
      <div className="mt-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
          <span>Rutas registradas en la base de datos ({savedRoutes.length})</span>
          <span className="flex items-center gap-1 text-slate-400">
            <MonitorCheck className="w-3.5 h-3.5 text-emerald-600" />
            Sincronizadas con cualquier equipo que se conecte
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {savedRoutes.map((route) => {
            const isCurrentlySelected =
              currentSearchPath.toLowerCase() === route.path.toLowerCase();
            const isDatabaseDefault =
              route.isDefault || activeRoute.toLowerCase() === route.path.toLowerCase();

            return (
              <div
                key={route.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  isCurrentlySelected
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {route.name}
                      </span>
                      {isDatabaseDefault && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Predeterminada en Servidor
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 mt-1 truncate bg-white/70 px-2 py-0.5 rounded border border-slate-200/80">
                      {route.path}
                    </div>
                    {route.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {route.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteWithAuth(route)}
                    title={isRouteUnlocked ? 'Eliminar esta ruta de la base de datos' : 'Ruta protegida por código'}
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectRouteWithAuth(route.path)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      isCurrentlySelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isCurrentlySelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ruta activa</span>
                      </>
                    ) : (
                      <>
                        {isRouteUnlocked ? <FolderOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                        <span>Cargar esta ruta</span>
                      </>
                    )}
                  </button>

                  {!isDatabaseDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultWithAuth(route.path)}
                      title="Fijar como ruta inicial cuando se abra la app desde otra PC"
                      className="text-[11px] font-medium text-slate-500 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Fijar para otras PCs</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
