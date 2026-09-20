import { PdfItem } from '../types';

/**
 * Ensures that any PdfItem has a real, downloadable Blob.
 * If the item has a File or Blob, it returns it directly.
 * If the item was loaded from storage or indexed without raw binary in memory,
 * it dynamically constructs a valid, standard PDF 1.4 binary file with complete metadata.
 */
export function getOrGeneratePdfBlob(item: PdfItem): Blob {
  if (item.file && item.file.size > 0) {
    return item.file;
  }
  if (item.blob && item.blob.size > 0) {
    return item.blob;
  }

  // Generate a valid PDF 1.4 document
  const generatedBlob = generateValidPdfDocument(item);
  item.blob = generatedBlob;
  return generatedBlob;
}

/**
 * Ensures a valid, non-empty ArrayBuffer for any item.
 */
export async function getOrGeneratePdfArrayBuffer(item: PdfItem): Promise<ArrayBuffer> {
  try {
    const blob = item.file || item.blob || getOrGeneratePdfBlob(item);
    if (blob && blob.size > 0) {
      const buffer = await blob.arrayBuffer();
      if (buffer && buffer.byteLength > 0) {
        return buffer;
      }
    }
  } catch (err) {
    console.warn(`Error leyendo buffer de ${item.name}, generando PDF de respaldo:`, err);
  }

  const fallback = generateValidPdfDocument(item);
  return await fallback.arrayBuffer();
}

/**
 * Triggers a direct browser download for a Blob with a specific filename.
 * Handles DOM attachment and cleanup reliably across all browsers.
 * Preserves the exact extension (.zip, .pdf, etc.) without altering valid filenames.
 * Returns the created Object URL and finalized fileName so callers can also offer direct click links.
 */
export function triggerBlobDownload(blob: Blob, rawFileName: string): { url: string; fileName: string } {
  let fileName = (rawFileName || 'documento').trim();

  // If the filename already ends with .zip or .pdf, preserve it as-is
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) {
    // Keep .zip
  } else if (lower.endsWith('.pdf')) {
    // Keep .pdf
  } else {
    // Determine appropriate extension from blob type or default to .pdf
    if (blob.type.includes('zip')) {
      fileName = `${fileName}.zip`;
    } else {
      fileName = `${fileName}.pdf`;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.target = '_self';
  // Avoid display: none which is ignored in some browsers; use off-screen positioning
  link.style.position = 'fixed';
  link.style.top = '-9999px';
  link.style.left = '-9999px';
  link.style.opacity = '0';
  link.style.pointerEvents = 'none';

  document.body.appendChild(link);

  try {
    link.click();
  } catch (err) {
    console.warn('Click automático bloqueado o no completado por el navegador:', err);
  }

  // Cleanup link element from DOM after a short delay
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 2000);

  // Note: we keep the URL active longer so manual fallback download links remain valid
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore if already revoked
    }
  }, 120000); // 2 minutes

  return { url, fileName };
}

/**
 * Pure TypeScript generator for a valid ISO 32000 / PDF 1.4 compliant document.
 * Uses exact byte calculations so that PDF readers (Adobe Acrobat, Chrome, Edge, Safari)
 * open the document with zero errors or corruption warnings.
 */
export function generateValidPdfDocument(item: PdfItem): Blob {
  const sanitize = (text: string) =>
    (text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' '); // Standard ASCII for standard PDF Type 1 font

  const title = sanitize(item.name);
  const path = sanitize(item.path);
  const folder = sanitize(item.folder);
  const dateStr = sanitize(new Date(item.lastModified || Date.now()).toLocaleString());
  const sizeStr = sanitize(`${(item.size / 1024).toFixed(1)} KB (${item.size.toLocaleString()} bytes)`);
  const summary = sanitize(item.summary || 'Documento indexado en el repositorio local.');
  const origin = sanitize(item.origin || 'local');

  // Stream content using standard PostScript text commands (BT ... ET)
  const streamLines = [
    'BT',
    '/F1 16 Tf',
    '50 730 Td',
    `(${title}) Tj`,
    '/F1 10 Tf',
    '0 -20 Td',
    '(================================================================================) Tj',
    '0 -20 Td',
    '/F1 12 Tf',
    '(INFORMACION DEL DOCUMENTO INDEXADO:) Tj',
    '/F1 10 Tf',
    '0 -18 Td',
    `(Ruta completa: ${path}) Tj`,
    '0 -16 Td',
    `(Carpeta contenedora: ${folder}) Tj`,
    '0 -16 Td',
    `(Fecha de modificacion: ${dateStr}) Tj`,
    '0 -16 Td',
    `(Tamano de archivo: ${sizeStr}) Tj`,
    '0 -16 Td',
    `(Origen: ${origin}) Tj`,
    '0 -24 Td',
    '/F1 12 Tf',
    '(RESUMEN Y CLASIFICACION:) Tj',
    '/F1 10 Tf',
    '0 -18 Td',
    `(${summary}) Tj`,
    '0 -30 Td',
    '(================================================================================) Tj',
    '0 -18 Td',
    '/F1 9 Tf',
    '(Exportado exitosamente desde el Buscador de PDFs en Carpetas) Tj',
    'ET'
  ];

  const streamContent = streamLines.join('\n');
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);
  const streamLength = streamBytes.length;

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5Prefix = `5 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
  const obj5Suffix = '\nendstream\nendobj\n';

  const bHeader = encoder.encode(header);
  const bObj1 = encoder.encode(obj1);
  const bObj2 = encoder.encode(obj2);
  const bObj3 = encoder.encode(obj3);
  const bObj4 = encoder.encode(obj4);
  const bObj5Prefix = encoder.encode(obj5Prefix);
  const bObj5Suffix = encoder.encode(obj5Suffix);

  const offset1 = bHeader.length;
  const offset2 = offset1 + bObj1.length;
  const offset3 = offset2 + bObj2.length;
  const offset4 = offset3 + bObj3.length;
  const offset5 = offset4 + bObj4.length;
  const startXref = offset5 + bObj5Prefix.length + streamBytes.length + bObj5Suffix.length;

  const pad10 = (n: number) => n.toString().padStart(10, '0');

  const xref =
    'xref\n' +
    '0 6\n' +
    '0000000000 65535 f \n' +
    `${pad10(offset1)} 00000 n \n` +
    `${pad10(offset2)} 00000 n \n` +
    `${pad10(offset3)} 00000 n \n` +
    `${pad10(offset4)} 00000 n \n` +
    `${pad10(offset5)} 00000 n \n`;

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  const bXref = encoder.encode(xref);
  const bTrailer = encoder.encode(trailer);

  // Combine into a single binary Blob
  return new Blob(
    [bHeader, bObj1, bObj2, bObj3, bObj4, bObj5Prefix, streamBytes, bObj5Suffix, bXref, bTrailer],
    { type: 'application/pdf' }
  );
}
