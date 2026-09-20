import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SourceSelector } from './components/SourceSelector';
import { SearchControls } from './components/SearchControls';
import { DownloadActionsBar } from './components/DownloadActionsBar';
import { ResultsList } from './components/ResultsList';
import { DirectoryExplorer } from './components/DirectoryExplorer';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { AddPdfModal } from './components/AddPdfModal';
import { ProcessingProgressModal } from './components/ProcessingProgressModal';
import { PdfItem, SearchFilter, DownloadProgress, SavedRoute, DatabaseStatus, ProcessingProgress } from './types';
import { getInitialRepositoryItems } from './utils/sampleData';
import {
  filterPdfItems,
  traverseDataTransferItemsWithProgress,
  parseLocalFolderFilesAsyncWithProgress,
  generateHighVolumeDatasetWithProgress
} from './utils/folderScanner';
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
import { saveLocalRouteToStorage, saveLocalRouteAsync, loadLocalRouteAsync } from './utils/localStorageRoute';
import { UploadCloud } from 'lucide-react';

export default function App() {
  // State for items
  const [repositoryItems, setRepositoryItems] = useState<PdfItem[]>(() => getInitialRepositoryItems());
  const [localItems, setLocalItems] = useState<PdfItem[]>([]);
  const [currentSource, setCurrentSource] = useState<'repository' | 'local'>('local');
  const [localFolderName, setLocalFolderName] = useState<string | null>(null);

  // Large Volume Processing and Real-Time Progress State
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [processingTargetRoute, setProcessingTargetRoute] = useState<string>('');
  const isCancelledRef = useRef<boolean>(false);

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

  // Ready ZIP notification and download error states
  const [readyZip, setReadyZip] = useState<{ url: string; fileName: string; count: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  // Restore saved local route from IndexedDB/LocalStorage on mount
  useEffect(() => {
    async function restoreLocalRoute() {
      try {
        const savedLocal = await loadLocalRouteAsync();
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
        console.error('Error al restaurar ruta desde almacenamiento local:', err);
      }
    }
    restoreLocalRoute();
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

  // Active items from local folder
  const activeItems = useMemo(() => {
    return localItems;
  }, [localItems]);

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

  // Synchronize selection: when results change, select items without choking the UI
  useEffect(() => {
    const total = filteredItems.length;
    if (total === 0) {
      setSelectedIds(new Set());
      return;
    }
    // If list is small (<= 100 items), select all by default
    if (total <= 100) {
      const newSelected = new Set<string>();
      for (let i = 0; i < total; i++) {
        newSelected.add(filteredItems[i].id);
      }
      setSelectedIds(newSelected);
    } else {
      // For large volumes (> 100 items), select the first 50 items (page 1) to keep the app ultra-responsive
      const newSelected = new Set<string>();
      const limit = Math.min(total, 50);
      for (let i = 0; i < limit; i++) {
        newSelected.add(filteredItems[i].id);
      }
      setSelectedIds(newSelected);
    }
  }, [filteredItems]);

  // Total size of currently selected files (fast pass)
  const selectedTotalSize = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    let sum = 0;
    if (selectedIds.size === filteredItems.length) {
      for (let i = 0; i < filteredItems.length; i++) {
        sum += filteredItems[i].size;
      }
      return sum;
    }
    for (let i = 0; i < filteredItems.length; i++) {
      const item = filteredItems[i];
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

  const handleSelectMany = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) {
        for (let i = 0; i < ids.length; i++) {
          next.add(ids[i]);
        }
      } else {
        for (let i = 0; i < ids.length; i++) {
          next.delete(ids[i]);
        }
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set<string>();
      for (let i = 0; i < filteredItems.length; i++) {
        newSelected.add(filteredItems[i].id);
      }
      setSelectedIds(newSelected);
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

  // High-Volume Folder Processing with Progress and Percentages
  const handleStartProcessFolderFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const firstFile = files[0];
    const firstPath = ('webkitRelativePath' in firstFile && firstFile.webkitRelativePath) ? firstFile.webkitRelativePath : firstFile.name;
    const rootName = firstPath.split('/')[0] || 'Carpeta seleccionada';

    setProcessingTargetRoute(rootName);
    isCancelledRef.current = false;

    try {
      const items = await parseLocalFolderFilesAsyncWithProgress(
        files,
        (progress) => setProcessingProgress(progress),
        () => isCancelledRef.current
      );

      if (isCancelledRef.current) return;

      // Persistence stage
      setProcessingProgress((prev) =>
        prev
          ? {
              ...prev,
              stage: 'persisting',
              stageLabel: `Guardando ${items.length.toLocaleString()} documentos en almacenamiento seguro...`,
              percentage: 96
            }
          : null
      );

      await saveLocalRouteAsync(rootName, items, rootName);

      setLocalItems(items);
      setLocalFolderName(rootName);
      setCurrentSource('local');
      setIsSavedInStorage(true);
      setSavedStorageDate(new Date().toISOString());

      setProcessingProgress((prev) =>
        prev
          ? {
              ...prev,
              isProcessing: false,
              stage: 'completed',
              percentage: 100,
              stageLabel: `¡Procesamiento exitoso! ${items.length.toLocaleString()} documentos PDF indexados y disponibles.`
            }
          : null
      );
    } catch (err) {
      console.error('Error al procesar archivos de carpeta:', err);
      setProcessingProgress(null);
    }
  };

  // Process and Index Information in a Specific Given Route with Real-Time Progress and Percentage
  const handleProcessRoute = async (routePath: string) => {
    const target = routePath.trim();
    const routeLabel = target || (currentSource === 'local' ? (localFolderName || 'Carpeta Local') : 'Repositorio Global');
    setProcessingTargetRoute(routeLabel);
    isCancelledRef.current = false;

    const totalSourceItems = activeItems;
    const startTime = Date.now();
    const total = totalSourceItems.length;

    setProcessingProgress({
      isProcessing: true,
      stage: 'scanning',
      stageLabel: `Examinando y procesando información en ruta: "${routeLabel}"...`,
      totalFiles: total,
      processedFiles: 0,
      pdfCount: 0,
      percentage: 0,
      currentPath: routeLabel,
      elapsedMs: 0
    });

    const matching: PdfItem[] = [];
    const BATCH = Math.max(10, Math.floor(total / 40));

    for (let i = 0; i < total; i++) {
      if (isCancelledRef.current) break;
      const item = totalSourceItems[i];

      const itemPath = item.path.toLowerCase();
      const cleanTarget = target.toLowerCase().replace(/^\/+|\/+$/g, '');
      const isUnderRoute = !cleanTarget || itemPath.includes(cleanTarget);

      if (isUnderRoute) {
        matching.push(item);
      }

      if (i % BATCH === 0 || i === total - 1) {
        const processed = i + 1;
        const pct = Math.min(100, Math.round((processed / total) * 100));
        const elapsed = Date.now() - startTime;
        const speed = elapsed > 100 ? Math.round((processed / elapsed) * 1000) : undefined;

        setProcessingProgress({
          isProcessing: true,
          stage: 'indexing',
          stageLabel: `Filtrando e indexando documentos (${processed.toLocaleString()} de ${total.toLocaleString()})...`,
          totalFiles: total,
          processedFiles: processed,
          pdfCount: matching.length,
          percentage: pct,
          currentPath: item.path,
          elapsedMs: elapsed,
          speedFilesPerSec: speed
        });

        await new Promise((r) => setTimeout(r, 10));
      }
    }

    // Apply route to filter
    setFilter((prev) => ({ ...prev, pathPrefix: target }));

    setProcessingProgress({
      isProcessing: false,
      stage: 'completed',
      stageLabel: `¡Procesamiento de ruta completado! ${matching.length.toLocaleString()} documentos PDF encontrados en "${routeLabel}".`,
      totalFiles: total,
      processedFiles: total,
      pdfCount: matching.length,
      percentage: 100,
      currentPath: `${routeLabel} (Indexada)`,
      elapsedMs: Date.now() - startTime
    });
  };

  // Simulate Large Volume with 3,500 PDFs with real-time percentage progress
  const handleSimulateLargeVolume = async (targetCount = 3500) => {
    const rootRoute = 'documentos/empresa_global';
    setProcessingTargetRoute('documentos/empresa_global (Gran Volumen)');
    isCancelledRef.current = false;

    try {
      const items = await generateHighVolumeDatasetWithProgress(
        targetCount,
        rootRoute,
        (progress) => setProcessingProgress(progress),
        () => isCancelledRef.current
      );

      if (isCancelledRef.current) return;

      setProcessingProgress((prev) =>
        prev
          ? {
              ...prev,
              stage: 'persisting',
              stageLabel: `Guardando ${items.length.toLocaleString()} documentos en almacenamiento seguro (IndexedDB)...`,
              percentage: 97
            }
          : null
      );

      await saveLocalRouteAsync('documentos/empresa_global', items, 'Empresa Global');

      setLocalItems(items);
      setLocalFolderName('Empresa Global (3,500 PDFs)');
      setCurrentSource('local');
      setIsSavedInStorage(true);
      setSavedStorageDate(new Date().toISOString());

      setProcessingProgress((prev) =>
        prev
          ? {
              ...prev,
              isProcessing: false,
              stage: 'completed',
              percentage: 100,
              stageLabel: `¡3,500 documentos procesados e indexados! Búsqueda ultrarrápida disponible.`
            }
          : null
      );
    } catch (err) {
      console.error('Error al generar gran volumen:', err);
      setProcessingProgress(null);
    }
  };

  const handleCancelProcessing = () => {
    isCancelledRef.current = true;
    setProcessingProgress(null);
  };

  // Download handlers
  const handleDownloadSingle = (item: PdfItem) => {
    downloadSinglePdf(item);
  };

  const handleDownloadZip = async (preserveFolders: boolean) => {
    setDownloadError(null);
    let itemsToDownload = filteredItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0 && filteredItems.length > 0) {
      // If none selected, cap at safe batch of 300 to protect browser memory and responsiveness
      itemsToDownload = filteredItems.slice(0, 300);
    }
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
      const result = await downloadPdfsAsZip(itemsToDownload, {
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

      if (result) {
        setReadyZip({
          url: result.url,
          fileName: result.fileName,
          count: result.totalItems
        });
      }
    } catch (err: any) {
      console.error('Error al generar ZIP:', err);
      setDownloadError(`No se pudo generar el archivo ZIP: ${err?.message || 'Error inesperado'}. Intenta seleccionando un número menor de archivos.`);
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
      }, 500);
    }
  };

  const handleDownloadOneByOne = async () => {
    let itemsToDownload = filteredItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0 && filteredItems.length > 0) {
      itemsToDownload = filteredItems;
    }
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
      setProcessingTargetRoute('Carpeta Arrastrada');
      isCancelledRef.current = false;
      const items = await traverseDataTransferItemsWithProgress(
        e.dataTransfer.items,
        (progress) => setProcessingProgress(progress),
        () => isCancelledRef.current
      );
      if (items.length > 0 && !isCancelledRef.current) {
        setLocalItems(items);
        setLocalFolderName('Carpeta Arrastrada');
        setCurrentSource('local');
        await saveLocalRouteAsync('Carpeta Arrastrada', items, 'Carpeta Arrastrada');
        setIsSavedInStorage(true);
        setSavedStorageDate(new Date().toISOString());
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
            Se escanearán automáticamente todas las subcarpetas y archivos .PDF contenidos con barra de progreso.
          </p>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        totalFiles={activeItems.length}
        matchedFiles={filteredItems.length}
        currentSource={currentSource}
        currentPath={filter.pathPrefix || (localFolderName || 'Raíz')}
        databaseStatus={databaseStatus}
        isSavedInStorage={isSavedInStorage}
        isRouteUnlocked={isRouteUnlocked}
        onRequestUnlockRoute={handleRequestUnlockRoute}
        onLockRoute={handleLockRoute}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Source Selector (Repository vs Local Folder with High Volume Support) */}
        <SourceSelector
          currentSource={currentSource}
          onSelectSource={setCurrentSource}
          onLocalFilesLoaded={handleLocalFilesLoaded}
          onStartProcessFiles={handleStartProcessFolderFiles}
          onSimulateLargeVolume={handleSimulateLargeVolume}
          localFolderName={localFolderName}
          localPdfCount={localItems.length}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isRouteUnlocked={isRouteUnlocked}
          onRequestUnlockRoute={handleRequestUnlockRoute}
          isSavedInStorage={isSavedInStorage}
          savedStorageDate={savedStorageDate}
        />

        {/* Search Query, Path & Mode Controls with Route Processing Button */}
        <SearchControls
          filter={filter}
          onFilterChange={handleFilterChange}
          onResetFilter={handleResetFilter}
          onProcessRoute={handleProcessRoute}
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
              readyZip={readyZip}
              onDismissReadyZip={() => setReadyZip(null)}
              downloadError={downloadError}
              onDismissDownloadError={() => setDownloadError(null)}
            />

            {/* Results List */}
            <ResultsList
              items={filteredItems}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectMany={handleSelectMany}
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

      {/* Large Volume Real-Time Processing Progress Modal with Percentages */}
      <ProcessingProgressModal
        progress={processingProgress}
        targetRouteName={processingTargetRoute}
        onCancel={handleCancelProcessing}
        onClose={() => setProcessingProgress(null)}
      />
    </div>
  );
}
