import React from 'react';
import { Search, FolderGit2, X, SlidersHorizontal, ArrowDownAZ, Lock, Unlock, Cpu, Play } from 'lucide-react';
import { SearchFilter, MatchMode } from '../types';

interface SearchControlsProps {
  filter: SearchFilter;
  onFilterChange: (updated: Partial<SearchFilter>) => void;
  onResetFilter: () => void;
  availableFolders: string[];
  totalResults: number;
  isRouteUnlocked: boolean;
  onRequestUnlockRoute: (actionDescription?: string) => void;
  onLockRoute: () => void;
  onProcessRoute?: (routePath: string) => void;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  filter,
  onFilterChange,
  onResetFilter,
  availableFolders,
  totalResults,
  isRouteUnlocked,
  onRequestUnlockRoute,
  onLockRoute,
  onProcessRoute
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-red-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            Criterios de Búsqueda y Rutas
          </h2>
        </div>
        {(filter.query || filter.pathPrefix) && (
          <button
            type="button"
            onClick={onResetFilter}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Field 1: PDF Name or partial name (starts blank) */}
        <div className="md:col-span-6 space-y-1.5">
          <label htmlFor="search-query-input" className="block text-xs font-medium text-slate-700">
            Nombre o parte del nombre del PDF
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="search-query-input"
              type="text"
              value={filter.query}
              onChange={(e) => onFilterChange({ query: e.target.value })}
              placeholder=""
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
            {filter.query && (
              <button
                type="button"
                onClick={() => onFilterChange({ query: '' })}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Field 2: Search within path or folder (protected with security code) */}
        <div className="md:col-span-6 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <label htmlFor="search-path-input" className="block text-xs font-medium text-slate-700">
              Ruta o subcarpeta a consultar (opcional)
            </label>
            {isRouteUnlocked ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Unlock className="w-3 h-3 text-emerald-600" />
                  Ruta Desbloqueada
                </span>
                <button
                  type="button"
                  onClick={onLockRoute}
                  className="text-[11px] font-medium text-slate-500 hover:text-red-700 underline"
                  title="Bloquear ruta para protegerla contra cambios"
                >
                  Bloquear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onRequestUnlockRoute('cambiar o editar la ruta')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 transition-colors"
                title="Haz clic para ingresar tu código y poder cambiar la ruta"
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Ruta Protegida · Desbloquear</span>
              </button>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <input
              id="search-path-input"
              type="text"
              list={isRouteUnlocked ? 'folder-datalist' : undefined}
              value={filter.pathPrefix}
              readOnly={!isRouteUnlocked}
              onClick={() => {
                if (!isRouteUnlocked) {
                  onRequestUnlockRoute('modificar la ruta de búsqueda');
                }
              }}
              onChange={(e) => {
                if (isRouteUnlocked) {
                  onFilterChange({ pathPrefix: e.target.value });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onProcessRoute) {
                  e.preventDefault();
                  onProcessRoute(filter.pathPrefix || '');
                }
              }}
              placeholder={isRouteUnlocked ? 'Escribe o selecciona una ruta...' : 'Ruta protegida (clic para desbloquear con código)'}
              className={`w-full pl-9 pr-14 py-2 text-sm border rounded-lg focus:outline-none transition-all text-slate-900 ${
                isRouteUnlocked
                  ? 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white'
                  : 'bg-slate-100/90 border-slate-300 text-slate-700 cursor-pointer hover:bg-amber-50/50 hover:border-amber-300'
              }`}
            />
            {isRouteUnlocked ? (
              filter.pathPrefix && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ pathPrefix: '' })}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => onRequestUnlockRoute('cambiar la ruta de búsqueda')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1 text-amber-700 hover:text-amber-800"
                title="Ruta bloqueada. Clic para ingresar código."
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
            {isRouteUnlocked && (
              <datalist id="folder-datalist">
                {availableFolders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            )}
          </div>

          {/* Action to process the route with progress bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-slate-500 truncate">
              Presiona Enter o haz clic en Procesar para consultar recursivamente esta ruta.
            </span>
            {onProcessRoute && (
              <button
                type="button"
                onClick={() => onProcessRoute(filter.pathPrefix || '')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors shrink-0"
                title="Procesar e indexar la información contenida en esta ruta con barra de progreso y porcentaje"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Procesar Ruta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode & Options Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-600 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Tipo de coincidencia:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(
              [
                { mode: 'contains', label: 'Contiene parte' },
                { mode: 'starts_with', label: 'Empieza por' },
                { mode: 'ends_with', label: 'Termina en' },
                { mode: 'exact', label: 'Exacto' }
              ] as { mode: MatchMode; label: string }[]
            ).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onFilterChange({ matchMode: mode })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter.matchMode === mode
                    ? 'bg-white text-red-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 select-none">
            <input
              type="checkbox"
              checked={filter.includeSubfolders}
              onChange={(e) => onFilterChange({ includeSubfolders: e.target.checked })}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
            />
            <span>Buscar recursivamente en subcarpetas</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
            <input
              type="checkbox"
              checked={filter.caseSensitive}
              onChange={(e) => onFilterChange({ caseSensitive: e.target.checked })}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
              Sensible a mayúsculas
            </span>
          </label>

          <div className="text-slate-500 font-medium ml-auto lg:ml-0">
            Resultados: <span className="font-bold text-slate-900">{totalResults}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
