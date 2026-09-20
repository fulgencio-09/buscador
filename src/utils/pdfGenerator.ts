/**
 * Generates valid PDF 1.4 binary blobs with structured text, timestamps, and path info.
 * This ensures any PDF searched or downloaded opens correctly in Adobe Reader, Chrome, etc.
 */

function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function createValidPdfBlob(
  title: string,
  filePath: string,
  details: {
    category?: string;
    creationDate?: string;
    description?: string;
    referenceNumber?: string;
  } = {}
): Blob {
  const safeTitle = escapePdfText(title);
  const safePath = escapePdfText(filePath);
  const safeCategory = escapePdfText(details.category || 'Documento Oficial');
  const safeDate = escapePdfText(details.creationDate || new Date().toLocaleDateString('es-ES'));
  const safeRef = escapePdfText(details.referenceNumber || `REF-${Math.floor(Math.random() * 900000 + 100000)}`);
  const safeDesc = escapePdfText(
    details.description || 'Documento digital archivado. Contenido generado para indexación y búsqueda documental.'
  );

  // Stream content drawing text on page
  const streamLines = [
    'BT',
    '/F1 20 Tf',
    '50 720 Td',
    `(${safeTitle}) Tj`,
    'ET',
    // Subtitle / category
    'BT',
    '/F1 11 Tf',
    '50 690 Td',
    `([${safeCategory}] - ${safeRef}) Tj`,
    'ET',
    // Divider line
    'q',
    '0.8 0.2 0.2 rg',
    '50 675 512 2 re',
    'f',
    'Q',
    // Metadata block
    'BT',
    '/F1 10 Tf',
    '50 650 Td',
    `(Ruta en repositorio: ${safePath}) Tj`,
    '0 -18 Td',
    `(Fecha de registro: ${safeDate}) Tj`,
    '0 -18 Td',
    `(Estado: Valido / Verificado) Tj`,
    '0 -28 Td',
    '/F1 12 Tf',
    '(Detalles del Documento:) Tj',
    '0 -20 Td',
    '/F1 10 Tf',
    `(${safeDesc}) Tj`,
    '0 -20 Td',
    '(Este archivo PDF fue localizado a traves del buscador de rutas y carpetas.) Tj',
    '0 -20 Td',
    '(Puede ser descargado de forma independiente o en paquete comprimido .ZIP.) Tj',
    'ET',
    // Footer line
    'q',
    '0.6 0.6 0.6 rg',
    '50 60 512 1 re',
    'f',
    'Q',
    'BT',
    '/F1 8 Tf',
    '50 45 Td',
    '(Generado por Buscador de PDFs - Sistema de Consulta y Descarga) Tj',
    'ET'
  ];

  const streamContent = streamLines.join('\n');
  const streamLength = streamContent.length;

  const bodyParts: string[] = [];
  const offsets: number[] = [];

  // Header
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let currentOffset = header.length;

  // Obj 1: Catalog
  offsets.push(currentOffset);
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  bodyParts.push(obj1);
  currentOffset += obj1.length;

  // Obj 2: Pages
  offsets.push(currentOffset);
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  bodyParts.push(obj2);
  currentOffset += obj2.length;

  // Obj 3: Page
  offsets.push(currentOffset);
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  bodyParts.push(obj3);
  currentOffset += obj3.length;

  // Obj 4: Font
  offsets.push(currentOffset);
  const obj4 = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  bodyParts.push(obj4);
  currentOffset += obj4.length;

  // Obj 5: Stream Contents
  offsets.push(currentOffset);
  const obj5 = `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  bodyParts.push(obj5);
  currentOffset += obj5.length;

  // Xref table
  const startXref = currentOffset;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdf = header + bodyParts.join('') + xref + trailer;

  return new Blob([fullPdf], { type: 'application/pdf' });
}
