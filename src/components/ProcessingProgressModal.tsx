import React from 'react';
import { ProcessingProgress } from '../types';
import { Loader2, CheckCircle2, XCircle, FileText, FolderGit2, Gauge, Clock, Zap } from 'lucide-react';

interface ProcessingProgressModalProps {
  progress: ProcessingProgress | null;
  targetRouteName: string;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ProcessingProgressModal: React.FC<ProcessingProgressModalProps> = ({
  progress,
  targetRouteName,
  onCancel,
  onClose
}) => {
  if (!progress || (!progress.isProcessing && progress.stage !== 'completed')) {
    return null;
  }

  const isComplete = progress.stage === 'completed';
  const pct = Math.min(100, Math.max(0, Math.round(progress.percentage)));
  const elapsedSeconds = (progress.elapsedMs / 1000).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
          isComplete ? 'bg-emerald-50/80 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isComplete
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                : 'bg-red-600 text-white shadow-sm shadow-red-200'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <h3 id="progress-modal-title" className="text-base font-bold text-slate-900 truncate">
                {isComplete ? 'Información procesada con éxito' : 'Procesando gran volumen de información'}
              </h3>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-medium text-slate-700">{targetRouteName}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-2xl font-black tabular-nums ${
              isComplete ? 'text-emerald-600' : 'text-slate-900'
            }`}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Progress Bar with glowing indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Zap className={`w-3.5 h-3.5 ${isComplete ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
                {progress.stageLabel}
              </span>
              <span className="tabular-nums text-slate-500">
                {progress.processedFiles.toLocaleString()} / {progress.totalFiles.toLocaleString()} archivos
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-200 ease-out ${
                  isComplete
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Real-time Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                <FileText className="w-3 h-3 text-red-500" />
                <span>PDFs válidos</span>
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {progress.pdfCount.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                <FolderGit2 className="w-3 h-3 text-blue-500" />
                <span>Procesados</span>
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {progress.processedFiles.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-500" />
                <span>Velocidad</span>
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {progress.speedFilesPerSec ? `${progress.speedFilesPerSec}/s` : 'Óptima'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" />
                <span>Tiempo</span>
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {elapsedSeconds}s
              </div>
            </div>
          </div>

          {/* Current file in flight */}
          {progress.currentPath && !isComplete && (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs font-mono">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Examinando en ruta actual:
              </div>
              <div className="truncate text-slate-200" title={progress.currentPath}>
                {progress.currentPath}
              </div>
            </div>
          )}

          {/* Complete banner */}
          {isComplete && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">La información de la ruta ha sido indexada y guardada.</p>
                <p className="text-emerald-700 mt-0.5">
                  Se registraron {progress.pdfCount.toLocaleString()} documentos PDF con sus rutas completas y subcarpetas. Ya puedes buscar y filtrar inmediatamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          {!isComplete && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Detener proceso</span>
            </button>
          )}

          {isComplete && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ver {progress.pdfCount.toLocaleString()} PDFs indexados</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
