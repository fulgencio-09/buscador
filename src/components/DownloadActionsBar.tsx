import React, { useState } from 'react';
import { Archive, Download, CheckSquare, Square, Loader2, FolderTree, Settings2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { DownloadProgress } from '../types';
import { formatFileSize } from '../utils/folderScanner';

interface DownloadActionsBarProps {
  totalResults: number;
  selectedCount: number;
  selectedTotalSize: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onDownloadZip: (preserveFolders: boolean) => void;
  onDownloadOneByOne: () => void;
  downloadProgress: DownloadProgress;
  readyZip?: { url: string; fileName: string; count: number } | null;
  onDismissReadyZip?: () => void;
  downloadError?: string | null;
  onDismissDownloadError?: () => void;
}

export const DownloadActionsBar: React.FC<DownloadActionsBarProps> = ({
  totalResults,
  selectedCount,
  selectedTotalSize,
  allSelected,
  onToggleSelectAll,
  onDownloadZip,
  onDownloadOneByOne,
  downloadProgress,
  readyZip,
  onDismissReadyZip,
  downloadError,
  onDismissDownloadError
}) => {
  const [preserveFolders, setPreserveFolders] = useState(true);
  const [showZipSettings, setShowZipSettings] = useState(false);

  if (totalResults === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Selection summary and Toggle all */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors py-1 px-2 rounded-md hover:bg-slate-100"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-red-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">{selectedCount}</span> de{' '}
            <span className="font-semibold text-slate-800">{totalResults}</span> seleccionados
            {selectedCount > 0 && (
              <span className="text-slate-500 font-medium ml-1.5">
                ({formatFileSize(selectedTotalSize)})
              </span>
            )}
          </div>
        </div>

        {/* Right: Download Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ZIP settings popover trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowZipSettings(!showZipSettings)}
              title="Opciones del archivo ZIP"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                showZipSettings
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {showZipSettings && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 z-30 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-red-600" />
                  Estructura dentro del ZIP
                </div>
                <label className="flex items-start gap-2 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="zipStructure"
                    checked={preserveFolders}
                    onChange={() => setPreserveFolders(true)}
                    className="text-red-600 mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Mantener carpetas</div>
                    <div className="text-slate-500 text-[11px]">
                      Organiza los PDFs en sus rutas y subdirectorios originales dentro del .ZIP.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="zipStructure"
                    checked={!preserveFolders}
                    onChange={() => setPreserveFolders(false)}
                    className="text-red-600 mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Carpeta plana (raíz)</div>
                    <div className="text-slate-500 text-[11px]">
                      Coloca todos los archivos PDF directamente en la raíz del .ZIP.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Download One by One button */}
          <button
            type="button"
            disabled={totalResults === 0 || downloadProgress.isDownloading}
            onClick={onDownloadOneByOne}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            {downloadProgress.isDownloading && downloadProgress.type === 'individual' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <Download className="w-4 h-4 text-slate-600" />
            )}
            <span>
              {selectedCount === 0
                ? `Descargar todos (${totalResults})`
                : `Descargar uno en uno (${selectedCount})`}
            </span>
          </button>

          {/* Download ZIP button */}
          <button
            type="button"
            disabled={totalResults === 0 || downloadProgress.isDownloading}
            onClick={() => onDownloadZip(preserveFolders)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-red-200"
          >
            {downloadProgress.isDownloading && downloadProgress.type === 'zip' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Archive className="w-4 h-4 text-white" />
            )}
            <span>
              {selectedCount === 0
                ? `Descargar todos en ZIP (${totalResults})`
                : `Descargar en ZIP (${selectedCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Progress Bar when generating ZIP or downloading sequentially */}
      {downloadProgress.isDownloading && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span className="font-medium flex items-center gap-1.5 truncate max-w-[80%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
              {downloadProgress.type === 'zip' ? 'Empaquetando ZIP: ' : 'Descargando archivo: '}
              <span className="text-slate-900 font-mono">{downloadProgress.currentFileName}</span>
            </span>
            <span className="font-bold text-red-600 shrink-0">
              {downloadProgress.percentage}% ({downloadProgress.current}/{downloadProgress.total})
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-200 ease-out"
              style={{ width: `${downloadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Ready ZIP Notification Banner with Direct Native Link */}
      {readyZip && (
        <div className="mt-3 pt-3 border-t border-emerald-100">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">
                  ¡Archivo ZIP generado con éxito! ({readyZip.count} documentos incluidos)
                </div>
                <div className="text-emerald-700 text-[11px]">
                  Si tu navegador no inició la descarga automáticamente, haz clic en el botón:
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={readyZip.url}
                download={readyZip.fileName}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar {readyZip.fileName}</span>
              </a>
              {onDismissReadyZip && (
                <button
                  type="button"
                  onClick={onDismissReadyZip}
                  className="text-emerald-700 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  title="Cerrar notificación"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Error Banner */}
      {downloadError && (
        <div className="mt-3 pt-3 border-t border-red-100">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            {onDismissDownloadError && (
              <button
                type="button"
                onClick={onDismissDownloadError}
                className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
