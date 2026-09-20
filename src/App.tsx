import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { SourceSelector } from './components/SourceSelector';
import { SearchControls } from './components/SearchControls';
import { DownloadActionsBar } from './components/DownloadActionsBar';
import { ResultsList } from './components/ResultsList';
import { DirectoryExplorer } from './components/DirectoryExplorer';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { AddPdfModal } from './components/AddPdfModal';
import { PdfItem, SearchFilter, DownloadProgress, SavedRoute, DatabaseStatus } from './types';
import { getInitialRepositoryItems } from './utils/sampleData';
import { filterPdfItems, traverseDataTransferItems } from './utils/folderScanner';
import { downloadPdfsAsZip } from './utils/zipDownloader';
import { downloadSinglePdf, downloadSequentially } from './utils/fileDownloader';
import {
  fetchSavedRoutes,
  fetchDatabaseStatus,
  saveRouteToDatabase,
  setActiveRouteInDatabase,
  deleteRouteFromDatabase
} from './utils/databaseApi';
import { RouteAuthModal } from './components/RouteAuthModal';
import { getActiveAuthCode, clearActiveAuthCode } from './utils/auth';
import { saveLocalRouteToStorage, getSavedLocalRouteFromStorage } from './utils/localStorageRoute';
import { UploadCloud } from 'lucide-react';

export default function App() {
  // State for items
  const [repositoryItems, setRepositoryItems] = useState<PdfItem[]>(() => getInitialRepositoryItems());
  const [localItems, setLocalItems] = useState<PdfItem[]>([]);
  const [currentSource, setCurrentSource] = useState<'repository' | 'local'>('repository');
  const [localFolderName, setLocalFolderName] = useState<string | null>(null);

  // Search Filter State
  const [filter, setFilter] = useState<SearchFilter>({
    query: '',
    pathPrefix: '',
    matchMode: 'contains',
    caseSensitive: false,
    includeSubfolders: true
  });

  // Selected file IDs for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals & Preview
  const [previewItem, setPreviewItem] = useState<PdfItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Download Progress State
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    isDownloading: false,
    total: 0,
    current: 0,
    percentage: 0,
    currentFileName: '',
    type: null
  });

  // Local Server Database Synchronization State
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [activeDbRoute, setActiveDbRoute] = useState<string>('');
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    status: 'loading',
    routesCount: 0,
    activeRoute: '',
    documentsCount: 0,
    lastUpdated: ''
  });

  // LocalStorage persistence state for local folder route
  const [savedStorageDate, setSavedStorageDate] = useState<string | null>(null);
  const [isSavedInStorage, setIsSavedInStorage] = useState<boolean>(false);

  // Route Security Authorization State (Master code: 8492)
  const [isRouteUnlocked, setIsRouteUnlocked] = useState<boolean>(() => Boolean(getActiveAuthCode()));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<{
    description?: string;
    callback?: () => void;
  } | null>(null);

  const handleRequestUnlockRoute = (actionDescription?: string, onAuthorized?: () => void) => {
    if (isRouteUnlocked) {
      if (onAuthorized) onAuthorized();
      return;
    }
    setPendingAuthAction({
      description: actionDescription,
      callback: onAuthorized
    });
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsRouteUnlocked(true);
    if (pendingAuthAction?.callback) {
      pendingAuthAction.callback();
    }
    setPendingAuthAction(null);
  };

  const handleLockRoute = () => {
    clearActiveAuthCode();
    setIsRouteUnlocked(false);
  };

  // Restore saved local route from LocalStorage on mount
  useEffect(() => {
    try {
      const savedLocal = getSavedLocalRouteFromStorage();
      if (savedLocal && savedLocal.folderName) {
        setLocalFolderName(savedLocal.folderName);
        if (Array.isArray(savedLocal.items) && savedLocal.items.length > 0) {
          setLocalItems(savedLocal.items as PdfItem[]);
        }
        setCurrentSource('local');
        setIsSavedInStorage(true);
        setSavedStorageDate(savedLocal.savedAt);
      }
    } catch (err) {
      console.error('Error al restaurar ruta desde LocalStorage:', err);
    }
  }, []);

  // Load saved routes and default path from server database on startup (for any PC that connects)
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        const [status, data] = await Promise.all([
          fetchDatabaseStatus(),
          fetchSavedRoutes()
        ]);
        setDatabaseStatus(status);
        setSavedRoutes(data.routes);

        if (data.activeRoute) {
          setActiveDbRoute(data.activeRoute);
          // Keep search filter fields blank by default as requested
        }
      } catch (err) {
        console.error('Error al inicializar base de datos local:', err);
      }
    }
    loadDatabaseData();
  }, []);

  const handleSelectSavedRoute = (path: string) => {
    if (!isRouteUnlocked) {
      handleRequestUnlockRoute(`cargar la ruta "${path}"`, () => {
        setFilter((prev) => ({ ...prev, pathPrefix: path }));
      });
      return;
    }
    setFilter((prev) => ({ ...prev, pathPrefix: path }));
  };

  const handleSetDefaultRoute = async (path: string) => {
    if (!isRouteUnlocked) {
      handleRequestUnlockRoute('establecer la ruta predeterminada en el servidor', () => {
        handleSetDefaultRoute(path);
      });
      return;
    }
    await setActiveRouteInDatabase(path);
    setActiveDbRoute(path);
    setSavedRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        isDefault: r.path.toLowerCase() === path.toLowerCase()
      }))
    );
  };

  const handleSaveCurrentPath = async (path: string, name?: string, description?: string) => {
    const saved = await saveRouteToDatabase({
      path,
      name,
      description,
      isDefault: true,
      pdfCount: filteredItems.length
    });

    setActiveDbRoute(saved.path);
    setSavedRoutes((prev) => {
      const filtered = prev.filter((r) => r.id !== saved.id);
      return [saved, ...filtered];
    });

    const status = await fetchDatabaseStatus();
    setDatabaseStatus(status);
  };

  const handleDeleteRoute = async (id: string) => {
    await deleteRouteFromDatabase(id);
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
    const status = await fetchDatabaseStatus();
    setDatabaseStatus(status);
  };

  const handleRefreshDatabase = async () => {
    const [status, data] = await Promise.all([
      fetchDatabaseStatus(),
      fetchSavedRoutes()
    ]);
    setDatabaseStatus(status);
    setSavedRoutes(data.routes);
    if (data.activeRoute) {
      setActiveDbRoute(data.activeRoute);
    }
  };

  // Active items based on current source
  const activeItems = useMemo(() => {
    return currentSource === 'repository' ? repositoryItems : localItems;
  }, [currentSource, repositoryItems, localItems]);

  // Filtered items based on search query, path, and options
  const filteredItems = useMemo(() => {
    return filterPdfItems(activeItems, filter);
  }, [activeItems, filter]);

  // Available unique folder paths for autocomplete datalist
  const availableFolders = useMemo(() => {
    const folders = new Set<string>();
    for (const item of activeItems) {
      folders.add(item.folder);
    }
    return Array.from(folders).sort();
  }, [activeItems]);

  // Synchronize selection: when results change, automatically select all matching items by default
  useEffect(() => {
    const newSelected = new Set<string>();
    for (const item of filteredItems) {
      newSelected.add(item.id);
    }
    setSelectedIds(newSelected);
  }, [filteredItems]);

  // Total size of currently selected files
  const selectedTotalSize = useMemo(() => {
    let sum = 0;
    for (const item of filteredItems) {
      if (selectedIds.has(item.id)) {
        sum += item.size;
      }
    }
    return sum;
  }, [filteredItems, selectedIds]);

  const allSelected =
    filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleFilterChange = (updated: Partial<SearchFilter>) => {
    if (updated.pathPrefix !== undefined && updated.pathPrefix !== filter.pathPrefix) {
      if (!isRouteUnlocked) {
        handleRequestUnlockRoute('cambiar la ruta de consulta', () => {
          setFilter((prev) => ({ ...prev, ...updated }));
        });
        return;
      }
    }
    setFilter((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilter = () => {
    setFilter((prev) => {
      // If route is locked, keep the existing pathPrefix and clear query
      if (!isRouteUnlocked && prev.pathPrefix) {
        return {
          ...prev,
          query: ''
        };
      }
      return {
        query: '',
        pathPrefix: '',
        matchMode: 'contains',
        caseSensitive: false,
        includeSubfolders: true
      };
    });
  };

  const handleLocalFilesLoaded = (items: PdfItem[], rootFolderName: string) => {
    setLocalItems(items);
    setLocalFolderName(rootFolderName);
    setCurrentSource('local');
    saveLocalRouteToStorage(rootFolderName, items, rootFolderName);
    setIsSavedInStorage(true);
    setSavedStorageDate(new Date().toISOString());
  };

  // Download handlers
  const handleDownloadSingle = (item: PdfItem) => {
    downloadSinglePdf(item);
  };

  const handleDownloadZip = async (preserveFolders: boolean) => {
    const itemsToDownload = filteredItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0) return;

    setDownloadProgress({
      isDownloading: true,
      total: itemsToDownload.length,
      current: 0,
      percentage: 0,
      currentFileName: 'Iniciando compresión...',
      type: 'zip'
    });

    try {
      await downloadPdfsAsZip(itemsToDownload, {
        preserveFolderStructure: preserveFolders,
        zipFileName: `busqueda_pdfs_${filter.query ? filter.query.replace(/\s+/g, '_') : 'documentos'}.zip`,
        onProgress: (current, total, percentage, currentFileName) => {
          setDownloadProgress({
            isDownloading: true,
            total,
            current,
            percentage,
            currentFileName,
            type: 'zip'
          });
        }
      });
    } catch (err) {
      console.error('Error al generar ZIP:', err);
    } finally {
      setTimeout(() => {
        setDownloadProgress({
          isDownloading: false,
          total: 0,
          current: 0,
          percentage: 0,
          currentFileName: '',
          type: null
        });
      }, 800);
    }
  };

  const handleDownloadOneByOne = async () => {
    const itemsToDownload = filteredItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0) return;

    setDownloadProgress({
      isDownloading: true,
      total: itemsToDownload.length,
      current: 0,
      percentage: 0,
      currentFileName: 'Iniciando descarga individual...',
      type: 'individual'
    });

    try {
      await downloadSequentially(itemsToDownload, (current, total, fileName) => {
        const pct = Math.round((current / total) * 100);
        setDownloadProgress({
          isDownloading: true,
          total,
          current,
          percentage: pct,
          currentFileName: fileName,
          type: 'individual'
        });
      });
    } catch (err) {
      console.error('Error al descargar uno por uno:', err);
    } finally {
      setTimeout(() => {
        setDownloadProgress({
          isDownloading: false,
          total: 0,
          current: 0,
          percentage: 0,
          currentFileName: '',
          type: null
        });
      }, 800);
    }
  };

  const handleAddPdf = (newItem: PdfItem) => {
    setRepositoryItems((prev) => [newItem, ...prev]);
    setCurrentSource('repository');
  };

  // Drag and drop handlers for folders or files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = await traverseDataTransferItems(e.dataTransfer.items);
      if (items.length > 0) {
        setLocalItems(items);
        setLocalFolderName('Carpeta Arrastrada');
        setCurrentSource('local');
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col relative font-sans antialiased"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-red-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none p-6 text-center">
          <UploadCloud className="w-16 h-16 animate-bounce mb-4" />
          <h2 className="text-2xl font-bold">Suelta tu carpeta o archivos PDF aquí</h2>
          <p className="text-sm text-red-100 max-w-md mt-1">
            Se escanearán automáticamente todas las subcarpetas y archivos .PDF contenidos.
          </p>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        totalFiles={activeItems.length}
        matchedFiles={filteredItems.length}
        currentSource={currentSource}
        currentPath={filter.pathPrefix || (currentSource === 'local' ? (localFolderName || 'Raíz') : 'documentos/')}
        databaseStatus={databaseStatus}
        isSavedInStorage={isSavedInStorage}
        isRouteUnlocked={isRouteUnlocked}
        onRequestUnlockRoute={handleRequestUnlockRoute}
        onLockRoute={handleLockRoute}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Source Selector (Repository vs Local Folder) */}
        <SourceSelector
          currentSource={currentSource}
          onSelectSource={setCurrentSource}
          onLocalFilesLoaded={handleLocalFilesLoaded}
          localFolderName={localFolderName}
          localPdfCount={localItems.length}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isRouteUnlocked={isRouteUnlocked}
          onRequestUnlockRoute={handleRequestUnlockRoute}
          isSavedInStorage={isSavedInStorage}
          savedStorageDate={savedStorageDate}
        />

        {/* Search Query, Path & Mode Controls */}
        <SearchControls
          filter={filter}
          onFilterChange={handleFilterChange}
          onResetFilter={handleResetFilter}
          availableFolders={availableFolders}
          totalResults={filteredItems.length}
          isRouteUnlocked={isRouteUnlocked}
          onRequestUnlockRoute={handleRequestUnlockRoute}
          onLockRoute={handleLockRoute}
        />

        {/* Two Columns layout: Left Folder Explorer / Right Results & Downloads */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Interactive Folder Tree */}
          <div className="lg:col-span-4 space-y-4">
            <DirectoryExplorer
              allItems={activeItems}
              filteredItems={filteredItems}
              currentPathPrefix={filter.pathPrefix}
              isRouteUnlocked={isRouteUnlocked}
              onRequestUnlockRoute={handleRequestUnlockRoute}
              onSelectPath={(path) => handleFilterChange({ pathPrefix: path })}
            />

            {/* Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 shadow-sm space-y-2">
              <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>Modos de Descarga Disponibles</span>
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-500 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-700 font-semibold">Descarga en ZIP:</strong> Agrupa todos los PDFs coincidentes en un único archivo comprimido, con opción de conservar las subcarpetas originales.
                </li>
                <li>
                  <strong className="text-slate-700 font-semibold">Descarga uno en uno:</strong> Descarga cada archivo de forma individual y secuencial directo al navegador.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Download Actions Bar & Matching Results */}
          <div className="lg:col-span-8 space-y-4">
            {/* Download Bar (ZIP / Individual / Select All) */}
            <DownloadActionsBar
              totalResults={filteredItems.length}
              selectedCount={selectedIds.size}
              selectedTotalSize={selectedTotalSize}
              allSelected={allSelected}
              onToggleSelectAll={handleToggleSelectAll}
              onDownloadZip={handleDownloadZip}
              onDownloadOneByOne={handleDownloadOneByOne}
              downloadProgress={downloadProgress}
            />

            {/* Results List */}
            <ResultsList
              items={filteredItems}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onDownloadSingle={handleDownloadSingle}
              onPreview={(item) => setPreviewItem(item)}
              searchQuery={filter.query}
            />
          </div>
        </div>
      </main>

      {/* PDF Document Preview Modal */}
      <PdfPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={handleDownloadSingle}
      />

      {/* Add PDF / Custom Path Modal */}
      <AddPdfModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddPdf={handleAddPdf}
        existingFolders={availableFolders}
      />

      {/* Route Authorization Security Modal */}
      <RouteAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={handleAuthSuccess}
        actionDescription={pendingAuthAction?.description}
      />
    </div>
  );
}
