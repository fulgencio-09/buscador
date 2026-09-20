import React, { useState } from 'react';
import { X, Plus, FolderPlus, FileText, Upload } from 'lucide-react';
import { PdfItem } from '../types';
import { createValidPdfBlob } from '../utils/pdfGenerator';

interface AddPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPdf: (newItem: PdfItem) => void;
  existingFolders: string[];
}

export const AddPdfModal: React.FC<AddPdfModalProps> = ({
  isOpen,
  onClose,
  onAddPdf,
  existingFolders
}) => {
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('documentos/proyectos');
  const [category, setCategory] = useState('Documento General');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = name.trim();
    if (!finalName && selectedFile) {
      finalName = selectedFile.name;
    }
    if (!finalName) return;

    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName = `${finalName}.pdf`;
    }

    const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, '') || 'documentos';
    const fullPath = `${cleanFolder}/${finalName}`;

    let blob: Blob;
    let size = 1024 * 150;

    if (selectedFile) {
      blob = selectedFile;
      size = selectedFile.size;
    } else {
      blob = createValidPdfBlob(finalName, fullPath, {
        category,
        description: description || 'Documento incorporado manualmente al repositorio para búsqueda.'
      });
      size = blob.size;
    }

    const newItem: PdfItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: finalName,
      folder: cleanFolder,
      path: fullPath,
      size,
      lastModified: Date.now(),
      origin: 'repository',
      blob,
      file: selectedFile || undefined,
      summary: description || category
    };

    onAddPdf(newItem);
    setName('');
    setDescription('');
    setSelectedFile(null);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!name) {
        setName(file.name);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Agregar PDF o Nueva Ruta
              </h3>
              <p className="text-xs text-slate-500">
                Añade un nuevo documento a las carpetas del repositorio para consultar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {/* Upload existing local PDF file optionally */}
          <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="font-semibold text-slate-700">
                {selectedFile ? selectedFile.name : 'Subir un archivo PDF real (opcional)'}
              </span>
              <span className="text-[11px] text-slate-500">
                o deja este campo vacío para generar un PDF válido automáticamente
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Nombre del archivo PDF *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: informe_anual_2024.pdf"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Ruta / Carpeta destino *
            </label>
            <input
              type="text"
              required
              list="existing-folders-list"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Ej: documentos/finanzas/2024"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
            />
            <datalist id="existing-folders-list">
              {existingFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1">
              Puedes escribir una nueva carpeta con subdirectorios separados por barras (/).
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Categoría o Etiqueta
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Contabilidad, Legal, RRHH..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Descripción o contenido breve
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumen del contenido del documento para el índice..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar en Repositorio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
