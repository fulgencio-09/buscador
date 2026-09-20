import React, { useRef } from 'react';
import { FolderOpen, UploadCloud, AlertCircle, Lock, Zap } from 'lucide-react';
import { parseLocalFolderFiles } from '../utils/folderScanner';
import { PdfItem } from '../types';

interface SourceSelectorProps {
  currentSource: 'repository' | 'local';
  onSelectSource?: (source: 'repository' | 'local') => void;
  onLocalFilesLoaded: (items: PdfItem[], rootFolderName: string) => void;
  onStartProcessFiles?: (files: FileList | File[]) => void;
  onSimulateLargeVolume?: (count?: number) => void;
  localFolderName: string | null;
  localPdfCount: number;
  onOpenAddModal?: () => void;
  isRouteUnlocked?: boolean;
  onRequestUnlockRoute?: (actionDescription?: string, onAuthorized?: () => void) => void;
  isSavedInStorage?: boolean;
  savedStorageDate?: string | null;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  onLocalFilesLoaded,
  onStartProcessFiles,
  onSimulateLargeVolume,
  localFolderName,
  localPdfCount,
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
            Directorio de Trabajo / Carpeta Local
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Escanea cualquier carpeta o ruta de tu dispositivo para consultar recursivamente todos sus documentos PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSimulateLargeVolume && (
            <div className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => onSimulateLargeVolume(5000)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-blue-900 bg-blue-100 hover:bg-blue-200 transition-colors"
                title="Procesar e indexar 5,000 PDFs para verificar el rendimiento fluido sin bloqueos"
              >
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Probar 5,000 PDFs</span>
              </button>
              <button
                type="button"
                onClick={() => onSimulateLargeVolume(3500)}
                className="px-2 py-1.5 text-[11px] font-medium text-blue-700 hover:text-blue-900 transition-colors"
                title="Probar lote de 3,500 PDFs"
              >
                3,500
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        {/* Local Computer Folder Panel */}
        <div className="rounded-lg p-3.5 sm:p-4 border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-600 text-white shadow-xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  Carpeta Local de tu Dispositivo
                </span>
                {localFolderName && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                    {localFolderName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Selecciona la carpeta raíz o arrastra cualquier directorio para consultar y filtrar al instante.
              </p>
            </div>
          </div>

          {/* Folder Picker trigger with Password / Lock Protection */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-xs transition-colors ${
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
              <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                <span className="font-semibold text-slate-900 font-mono truncate max-w-[180px]" title={localFolderName}>
                  {localFolderName}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700 font-semibold">{localPdfCount.toLocaleString()} PDFs</span>
                {isSavedInStorage && (
                  <span
                    title={`Guardada en LocalStorage / IndexedDB${savedStorageDate ? ` (${new Date(savedStorageDate).toLocaleDateString()})` : ''}`}
                    className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Guardado
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {!localFolderName && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Haz clic en <strong>&quot;Seleccionar carpeta local&quot;</strong> o arrastra cualquier carpeta aquí para consultar tus archivos PDF.</span>
          </div>
        )}
      </div>
    </div>
  );
};
