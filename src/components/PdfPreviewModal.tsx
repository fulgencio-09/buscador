import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Folder, Calendar, HardDrive } from 'lucide-react';
import { PdfItem } from '../types';
import { formatFileSize, formatDate } from '../utils/folderScanner';

interface PdfPreviewModalProps {
  item: PdfItem | null;
  onClose: () => void;
  onDownload: (item: PdfItem) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  item,
  onClose,
  onDownload
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setObjectUrl(null);
      return;
    }

    const data = item.file || item.blob;
    if (data) {
      const url = URL.createObjectURL(data);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {item.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate">
                {item.path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata info strip */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Carpeta:</span>
            <span className="font-mono text-slate-800">{item.folder}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Tamaño:</span>
            <span>{formatFileSize(item.size)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Modificado:</span>
            <span>{formatDate(item.lastModified)}</span>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 bg-slate-100 min-h-[360px] p-2 overflow-hidden flex flex-col">
          {objectUrl ? (
            <iframe
              src={objectUrl}
              title={`Vista previa de ${item.name}`}
              className="w-full h-full min-h-[420px] rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <FileText className="w-12 h-12 text-slate-300 mb-2" />
              <p>Generando visor de documento...</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>Vista previa en visor integrado</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
