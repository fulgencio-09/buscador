import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronDown, ChevronRight, Compass, Lock } from 'lucide-react';
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
  matchingCount: number;
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

  // Build folder hierarchy tree
  const rootTree: TreeNode = {
    name: 'Raíz',
    fullPath: '',
    children: new Map(),
    matchingCount: filteredItems.length,
    totalCount: allItems.length
  };

  const matchingSet = new Set(filteredItems.map((i) => i.id));

  // Populate total items
  for (const item of allItems) {
    const segments = item.folder.split('/').filter(Boolean);
    let currentNode = rootTree;
    let accumulatedPath = '';

    for (const seg of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
      if (!currentNode.children.has(seg)) {
        currentNode.children.set(seg, {
          name: seg,
          fullPath: accumulatedPath,
          children: new Map(),
          matchingCount: 0,
          totalCount: 0
        });
      }
      const child = currentNode.children.get(seg)!;
      child.totalCount += 1;
      if (matchingSet.has(item.id)) {
        child.matchingCount += 1;
      }
      currentNode = child;
    }
  }

  // Recursive folder tree item renderer
  const renderTreeNodes = (node: TreeNode, depth = 0): React.ReactNode => {
    const childrenArray = Array.from(node.children.values());
    if (childrenArray.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-3 border-l border-slate-200 pl-2' : ''}`}>
        {childrenArray.map((child) => {
          const isSelected = currentPathPrefix.toLowerCase() === child.fullPath.toLowerCase();

          return (
            <div key={child.fullPath}>
              <div
                onClick={() => handleSelectWithAuth(isSelected ? '' : child.fullPath)}
                className={`flex items-center justify-between py-1 px-2 rounded-md cursor-pointer text-xs transition-colors ${
                  isSelected
                    ? 'bg-red-50 text-red-700 font-semibold border border-red-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {child.children.size > 0 ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate font-mono">{child.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[11px]">
                  {child.matchingCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {child.matchingCount}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-400">{child.totalCount}</span>
                </div>
              </div>

              {renderTreeNodes(child, depth + 1)}
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
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>(Todos los directorios)</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
              {filteredItems.length} de {allItems.length}
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
