import React from 'react';
import { FileSearch, FolderTree, Archive, HardDrive, Database, Lock, Unlock } from 'lucide-react';
import { DatabaseStatus } from '../types';

interface HeaderProps {
  totalFiles: number;
  matchedFiles: number;
  currentSource: 'local' | 'repository';
  currentPath: string;
  databaseStatus?: DatabaseStatus;
  isSavedInStorage?: boolean;
  isRouteUnlocked?: boolean;
  onRequestUnlockRoute?: (actionDescription?: string) => void;
  onLockRoute?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalFiles,
  matchedFiles,
  currentSource,
  currentPath,
  isSavedInStorage,
  isRouteUnlocked,
  onRequestUnlockRoute,
  onLockRoute
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Buscador de PDFs en Carpetas
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                  PDF & ZIP
                </span>
                {isSavedInStorage && (
                  <span
                    title="La ruta local y sus archivos están guardados en LocalStorage y protegidos con contraseña"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <HardDrive className="w-3 h-3 text-emerald-600" />
                    <span>LocalStorage Guardado</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Consulta archivos PDF por coincidencia de nombre en rutas y subdirectorios, con persistencia en LocalStorage y protección por contraseña.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            {/* Route Protection Badge & Button */}
            {isRouteUnlocked ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold shadow-2xs">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ruta Desbloqueada</span>
                {onLockRoute && (
                  <button
                    type="button"
                    onClick={onLockRoute}
                    className="text-slate-500 hover:text-red-700 underline text-[11px] ml-1"
                    title="Volver a bloquear la ruta"
                  >
                    Bloquear
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onRequestUnlockRoute?.('cambiar o editar la ruta')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-colors shadow-2xs"
                title="Ruta protegida con código. Clic para ingresar tu código y desbloquear."
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Ruta Protegida · Desbloquear</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              {currentSource === 'local' ? (
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <FolderTree className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{currentSource === 'local' ? 'Carpeta Local' : 'Repositorio'}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 font-mono max-w-[140px] truncate" title={currentPath}>
                {currentPath || '/'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <span className="text-slate-500">Total indexados:</span>
              <span className="font-semibold text-slate-900">{totalFiles}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Archive className="w-3.5 h-3.5 text-emerald-600" />
              <span>Coincidencias:</span>
              <span className="font-bold">{matchedFiles}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

