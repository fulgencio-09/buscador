import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Copy,
  Check,
  Folder,
  ChevronRight,
  FolderSearch,
  CheckSquare,
  Square
} from 'lucide-react';
import { PdfItem } from '../types';
import { formatFileSize, formatDate } from '../utils/folderScanner';

interface ResultsListProps {
  items: PdfItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDownloadSingle: (item: PdfItem) => void;
  onPreview: (item: PdfItem) => void;
  searchQuery: string;
}

/**
 * Highlights occurrences of the search term in the file name.
 */
function HighlightedFileName({ name, query }: { name: string; query: string }) {
  if (!query.trim()) {
    return <span className="font-semibold text-slate-900">{name}</span>;
  }

  const cleanQuery = query.trim();
  const lowerName = name.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const index = lowerName.indexOf(lowerQuery);

  if (index === -1) {
    return <span className="font-semibold text-slate-900">{name}</span>;
  }

  const before = name.substring(0, index);
  const match = name.substring(index, index + cleanQuery.length);
  const after = name.substring(index + cleanQuery.length);

  return (
    <span className="font-semibold text-slate-900">
      {before}
      <mark className="bg-amber-200 text-amber-900 px-0.5 rounded font-bold">
        {match}
      </mark>
      {after}
    </span>
  );
}

export const ResultsList: React.FC<ResultsListProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onDownloadSingle,
  onPreview,
  searchQuery
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPath = (item: PdfItem) => {
    navigator.clipboard.writeText(item.path);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <FolderSearch className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          No se encontraron archivos PDF coincidentes
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
          No hay ningún documento que coincida con el criterio de búsqueda o la ruta especificada. Intenta reducir los filtros, buscar por una parte menor del nombre o revisar la carpeta.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header bar of results */}
      <div className="px-4 py-3 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span>Resultados encontrados: {items.length} PDF{items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="hidden sm:block text-slate-400 font-normal">
          Haz clic en cualquier fila para seleccionarla para descarga múltiple
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const pathSegments = item.folder.split('/').filter(Boolean);

          return (
            <div
              key={item.id}
              onClick={() => onToggleSelect(item.id)}
              className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/80'
              }`}
            >
              {/* Checkbox & File Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id);
                  }}
                  className="mt-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-red-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                <div className="w-9 h-9 rounded-lg bg-red-100/70 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <HighlightedFileName name={item.name} query={searchQuery} />
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {formatFileSize(item.size)}
                    </span>
                  </div>

                  {/* Folder path breadcrumbs */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                    <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {pathSegments.map((seg, i) => (
                      <React.Fragment key={i}>
                        <span className="text-slate-600">{seg}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                      </React.Fragment>
                    ))}
                    <span className="text-slate-400 font-sans text-[11px] truncate max-w-[200px]">
                      {item.name}
                    </span>
                  </div>

                  {item.summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {item.summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions on right */}
              <div
                className="flex items-center gap-1.5 sm:self-center shrink-0 pl-10 sm:pl-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-slate-400 mr-2 hidden lg:inline">
                  {formatDate(item.lastModified)}
                </span>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={() => onPreview(item)}
                  title="Ver vista previa del documento"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Vista previa</span>
                </button>

                {/* Copy Path Button */}
                <button
                  type="button"
                  onClick={() => handleCopyPath(item)}
                  title="Copiar ruta del archivo"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedId === item.id ? 'Copiada' : 'Ruta'}
                  </span>
                </button>

                {/* Single Download Button */}
                <button
                  type="button"
                  onClick={() => onDownloadSingle(item)}
                  title="Descargar este archivo individualmente"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
