import React, { useState, useEffect, useMemo } from 'react';
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
  Square,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Layers
} from 'lucide-react';
import { PdfItem } from '../types';
import { formatFileSize, formatDate } from '../utils/folderScanner';

interface ResultsListProps {
  items: PdfItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMany?: (ids: string[], select: boolean) => void;
  onDownloadSingle: (item: PdfItem) => void;
  onPreview: (item: PdfItem) => void;
  searchQuery: string;
}

/**
 * Highlights occurrences of the search term in the file name.
 */
const HighlightedFileName = React.memo(function HighlightedFileName({
  name,
  query
}: {
  name: string;
  query: string;
}) {
  if (!query || !query.trim()) {
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
});

export const ResultsList: React.FC<ResultsListProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectMany,
  onDownloadSingle,
  onPreview,
  searchQuery
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // When items collection or search query changes, reset back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, searchQuery]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Sliced items for ultra-responsive rendering (at most pageSize in DOM)
  const pagedItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, safePage, pageSize]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(totalItems, startIndex + pageSize);

  const handleCopyPath = (item: PdfItem) => {
    navigator.clipboard.writeText(item.path);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle selection for all items currently visible on this page
  const pageIds = useMemo(() => pagedItems.map((item) => item.id), [pagedItems]);
  const allCurrentPageSelected = useMemo(() => {
    if (pageIds.length === 0) return false;
    return pageIds.every((id) => selectedIds.has(id));
  }, [pageIds, selectedIds]);

  const handleToggleCurrentPage = () => {
    if (!onSelectMany) {
      pageIds.forEach((id) => onToggleSelect(id));
      return;
    }
    onSelectMany(pageIds, !allCurrentPageSelected);
  };

  if (totalItems === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <FolderSearch className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          No se encontraron archivos PDF coincidentes
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
          No hay ningún documento que coincida con el criterio de búsqueda o la ruta especificada. Intenta reducir los filtros o revisar la ruta escrita.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header bar of results with Pagination & Batch Actions */}
      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Layers className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              Total: <strong className="font-bold text-slate-900">{totalItems.toLocaleString()}</strong> PDFs
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <span className="text-slate-500 font-medium">
            Mostrando {startIndex + 1} - {endIndex} (Pág. {safePage} de {totalPages})
          </span>
        </div>

        {/* Quick selection and page size control */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleCurrentPage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition-colors"
            title="Seleccionar o deseleccionar solo los archivos de esta página"
          >
            {allCurrentPageSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-red-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Página actual ({pagedItems.length})</span>
          </button>

          {/* Page size select */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 font-medium focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>
      </div>

      {/* Paginated list items */}
      <div className="divide-y divide-slate-100">
        {pagedItems.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const pathSegments = item.folder.split('/').filter(Boolean);

          return (
            <div
              key={item.id}
              onClick={() => onToggleSelect(item.id)}
              className={`p-3 sm:p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
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
                  aria-label={isSelected ? 'Deseleccionar archivo' : 'Seleccionar archivo'}
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
                <span className="text-xs text-slate-400 mr-2 hidden lg:inline tabular-nums">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setDownloadingId(item.id);
                    onDownloadSingle(item);
                    setTimeout(() => {
                      setDownloadingId(null);
                    }, 1800);
                  }}
                  title="Descargar este archivo individualmente"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs ${
                    downloadingId === item.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-white bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {downloadingId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Descargando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Página <strong className="text-slate-900">{safePage}</strong> de{' '}
            <strong className="text-slate-900">{totalPages}</strong>
            <span className="hidden sm:inline"> ({totalItems.toLocaleString()} documentos totales)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Quick jump numeric indicator */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let p = safePage - 2 + idx;
                if (safePage <= 3) p = idx + 1;
                else if (safePage >= totalPages - 2) p = totalPages - 4 + idx;

                if (p < 1 || p > totalPages) return null;

                const isActive = p === safePage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
