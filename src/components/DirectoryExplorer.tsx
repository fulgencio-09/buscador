import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, ChevronDown, ChevronRight, Compass, FolderTree } from 'lucide-react';
import { PdfItem } from '../types';

interface DirectoryExplorerProps {
  allItems: PdfItem[];
  filteredItems: PdfItem[];
  currentPathPrefix: string;
  isRouteUnlocked?: boolean;
  onRequestUnlockRoute?: (actionDescription?: string, onAuthorized?: () => void) => void;
  onSelectPath: (path: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  totalCount: number;
}

export const DirectoryExplorer: React.FC<DirectoryExplorerProps> = ({
  allItems,
  filteredItems,
  currentPathPrefix,
  isRouteUnlocked = true,
  onRequestUnlockRoute,
  onSelectPath
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openedFolders, setOpenedFolders] = useState<Set<string>>(() => new Set());

  const handleSelectWithAuth = (targetPath: string) => {
    if (!isRouteUnlocked && onRequestUnlockRoute) {
      onRequestUnlockRoute(
        targetPath ? `seleccionar la carpeta "${targetPath}" como ruta activa` : 'limpiar la ruta activa',
        () => onSelectPath(targetPath)
      );
    } else {
      onSelectPath(targetPath);
    }
  };

  const toggleFolderOpen = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setOpenedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Build folder hierarchy tree only when allItems changes (memoized for high volume)
  const rootTree = useMemo<TreeNode>(() => {
    const root: TreeNode = {
      name: 'Raíz',
      fullPath: '',
      children: new Map(),
      totalCount: allItems.length
    };

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const segments = item.folder.split('/').filter(Boolean);
      let currentNode = root;
      let accumulatedPath = '';

      for (const seg of segments) {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
        let child = currentNode.children.get(seg);
        if (!child) {
          child = {
            name: seg,
            fullPath: accumulatedPath,
            children: new Map(),
            totalCount: 0
          };
          currentNode.children.set(seg, child);
        }
        child.totalCount += 1;
        currentNode = child;
      }
    }

    return root;
  }, [allItems]);

  // Recursive folder tree item renderer with depth control and collapsible nodes
  const renderTreeNodes = (node: TreeNode, depth = 0): React.ReactNode => {
    const childrenArray = Array.from(node.children.values());
    if (childrenArray.length === 0) return null;

    // Cap excessive folder nodes rendering to maintain 60fps
    const displayList = childrenArray.slice(0, 100);

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-2.5 border-l border-slate-200 pl-2' : ''}`}>
        {displayList.map((child) => {
          const isSelected = currentPathPrefix.toLowerCase() === child.fullPath.toLowerCase();
          const hasChildren = child.children.size > 0;
          const isNodeOpen = openedFolders.has(child.fullPath) || (depth === 0 && childrenArray.length <= 12);

          return (
            <div key={child.fullPath}>
              <div
                onClick={() => handleSelectWithAuth(isSelected ? '' : child.fullPath)}
                className={`flex items-center justify-between py-1 px-2 rounded-md cursor-pointer text-xs transition-colors group ${
                  isSelected
                    ? 'bg-red-50 text-red-700 font-semibold border border-red-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => toggleFolderOpen(e, child.fullPath)}
                      className="p-0.5 -ml-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    >
                      {isNodeOpen ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-3" />
                  )}

                  {isNodeOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate font-mono">{child.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[11px]">
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {child.totalCount.toLocaleString()}
                  </span>
                </div>
              </div>

              {hasChildren && isNodeOpen && renderTreeNodes(child, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-100"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Compass className="w-4 h-4 text-red-600" />
          <span>Explorador de Árbol de Carpetas</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[11px] text-slate-500">
            {currentPathPrefix ? `Filtrando: ${currentPathPrefix}` : 'Todas'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div
            onClick={() => handleSelectWithAuth('')}
            className={`flex items-center justify-between py-1 px-2 rounded-md cursor-pointer text-xs transition-colors ${
              !currentPathPrefix
                ? 'bg-red-50 text-red-700 font-semibold border border-red-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-slate-500" />
              <span>(Todos los directorios)</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
              {filteredItems.length.toLocaleString()} de {allItems.length.toLocaleString()}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            {renderTreeNodes(rootTree)}
          </div>
        </div>
      )}
    </div>
  );
};
