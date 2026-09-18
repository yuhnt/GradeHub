/** Same limit as the backend (backend/src/middleware/upload.middleware.ts). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Why this file can't be uploaded, or null when it can. */
export function validatePdf(file: File): string | null {
  const looksLikePdf = file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name));
  if (!looksLikePdf) return 'Only PDF files are accepted.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_PDF_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 10 MB.`;
  return null;
}

/**
 * The backend checks the declared MIME type. Some systems report no type
 * for .pdf files, so label those explicitly before uploading.
 */
export function asPdf(file: File): File {
  return file.type === 'application/pdf' ? file : new File([file], file.name, { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A safe file name built from free text, e.g. a task title. */
export function toFileName(parts: string[], extension = 'pdf'): string {
  const base = parts
    .join('-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents: "Bài tập" -> "Bai tap"
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'download'}.${extension}`;
}

export function downloadCsv(rows: (string | number | null)[][], filename: string) {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value);
    // Quote everything; neutralise spreadsheet formulas (CSV injection).
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  // BOM so Excel reads UTF-8 names correctly.
  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), filename);
}
