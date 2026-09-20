import React, { useRef } from 'react';
import { FolderOpen, Server, UploadCloud, PlusCircle, CheckCircle2, AlertCircle, Lock, Zap, Gauge } from 'lucide-react';
import { parseLocalFolderFiles } from '../utils/folderScanner';
import { PdfItem } from '../types';

interface SourceSelectorProps {
  currentSource: 'repository' | 'local';
  onSelectSource: (source: 'repository' | 'local') => void;
  onLocalFilesLoaded: (items: PdfItem[], rootFolderName: string) => void;
  onStartProcessFiles?: (files: FileList | File[]) => void;
  onSimulateLargeVolume?: (count?: number) => void;
  localFolderName: string | null;
  localPdfCount: number;
  onOpenAddModal: () => void;
  isRouteUnlocked?: boolean;
  onRequestUnlockRoute?: (actionDescription?: string, onAuthorized?: () => void) => void;
  isSavedInStorage?: boolean;
  savedStorageDate?: string | null;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  currentSource,
  onSelectSource,
  onLocalFilesLoaded,
  onStartProcessFiles,
  onSimulateLargeVolume,
  localFolderName,
  localPdfCount,
  onOpenAddModal,
  isRouteUnlocked = true,
  onRequestUnlockRoute,
  isSavedInStorage,
  savedStorageDate
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (onStartProcessFiles) {
        onStartProcessFiles(files);
      } else {
        const items = parseLocalFolderFiles(files);
        const firstPath = files[0].webkitRelativePath || files[0].name;
        const rootName = firstPath.split('/')[0] || 'Carpeta seleccionada';
        onLocalFilesLoaded(items, rootName);
      }
    }
  };

  const handleTriggerPicker = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleFolderButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSource('local');

    if (!isRouteUnlocked && onRequestUnlockRoute) {
      onRequestUnlockRoute('cambiar la carpeta local protegida', () => {
        handleTriggerPicker();
      });
      return;
    }

    handleTriggerPicker();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Origen de Datos / Directorio Raíz
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Selecciona si deseas buscar en el repositorio documental estructurado o escanear una carpeta de tu ordenador.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSimulateLargeVolume && (
            <button
              type="button"
              onClick={() => onSimulateLargeVolume(3500)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
              title="Procesar e indexar un lote de 3,500 PDFs corporativos para probar el sistema de progreso en grandes volúmenes"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Probar Gran Volumen (3,500 PDFs)</span>
            </button>
          )}

          {currentSource === 'repository' && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Agregar PDF o Carpeta</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {/* Option 1: Structured Repository */}
        <div
          onClick={() => onSelectSource('repository')}
          className={`cursor-pointer rounded-lg p-3.5 border transition-all flex items-start gap-3 ${
            currentSource === 'repository'
              ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              currentSource === 'repository'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                Repositorio de Rutas y Carpetas
              </span>
              {currentSource === 'repository' && (
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Explora carpetas organizadas por departamentos (<code className="text-red-700 bg-red-100/50 px-1 py-0.5 rounded">finanzas/</code>, <code className="text-red-700 bg-red-100/50 px-1 py-0.5 rounded">legal/</code>, <code className="text-red-700 bg-red-100/50 px-1 py-0.5 rounded">recursos_humanos/</code>).
            </p>
          </div>
        </div>

        {/* Option 2: Local Computer Folder */}
        <div
          onClick={() => onSelectSource('local')}
          className={`cursor-pointer rounded-lg p-3.5 border transition-all flex items-start gap-3 ${
            currentSource === 'local'
              ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              currentSource === 'local'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                Carpeta Local de tu Dispositivo
              </span>
              {currentSource === 'local' && (
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Selecciona cualquier carpeta de tu disco duro para consultar recursivamente todos sus subdirectorios.
            </p>

            {/* Folder Picker trigger with Password / Lock Protection */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory is standard in all modern browsers
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleFolderButtonClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border shadow-xs transition-colors ${
                  !isRouteUnlocked
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
                title={!isRouteUnlocked ? 'Requiere contraseña para cambiar la carpeta local' : 'Cambiar carpeta local'}
              >
                {!isRouteUnlocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
                <span>{localFolderName ? 'Cambiar carpeta local' : 'Seleccionar carpeta local'}</span>
                {!isRouteUnlocked && (
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    PIN
                  </span>
                )}
              </button>

              {localFolderName && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                  <span className="font-semibold text-slate-900 font-mono truncate max-w-[200px]" title={localFolderName}>
                    {localFolderName}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-medium">{localPdfCount} PDFs</span>
                  {isSavedInStorage && (
                    <span
                      title={`Guardada en LocalStorage${savedStorageDate ? ` (${new Date(savedStorageDate).toLocaleDateString()})` : ''}`}
                      className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold"
                    >
                      LocalStorage Guardado
                    </span>
                  )}
                </div>
              )}
            </div>

            {currentSource === 'local' && !localFolderName && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Haz clic en &quot;Seleccionar carpeta local&quot; para escanear tus archivos.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
