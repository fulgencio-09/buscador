export type MatchMode = 'contains' | 'starts_with' | 'ends_with' | 'exact';

export interface PdfItem {
  id: string;
  name: string;
  path: string;
  folder: string;
  size: number;
  lastModified: number;
  origin: 'local' | 'repository';
  blob?: Blob;
  file?: File;
  summary?: string;
}

export interface SearchFilter {
  query: string;
  pathPrefix: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
  includeSubfolders: boolean;
}

export interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
  files: PdfItem[];
}

export interface DownloadProgress {
  isDownloading: boolean;
  total: number;
  current: number;
  percentage: number;
  currentFileName: string;
  type: 'zip' | 'individual' | null;
}

export interface SavedRoute {
  id: string;
  path: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
  lastAccessedAt: string;
  pdfCount?: number;
}

export interface DatabaseStatus {
  status: 'online' | 'offline' | 'loading';
  storageFile?: string;
  routesCount: number;
  activeRoute: string;
  documentsCount: number;
  lastUpdated: string;
}
