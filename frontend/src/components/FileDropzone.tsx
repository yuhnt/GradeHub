import { useId, useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatBytes, validatePdf } from '../lib/files';

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}

/** Pick or drop one PDF. Rejects other types and files over 10 MB up front. */
export function FileDropzone({ file, onFileChange, disabled = false, label = 'PDF file' }: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validatePdf(candidate);
    setError(problem);
    onFileChange(problem ? null : candidate);
  };

  const clear = () => {
    setError(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 ring-inset">
        <FileText aria-hidden="true" className="size-5 shrink-0 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          aria-label={`Remove ${file.name}`}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400',
          disabled && 'cursor-not-allowed opacity-60',
          error && 'border-red-400',
        )}
      >
        <UploadCloud aria-hidden="true" className="size-7 text-slate-400" />
        <span className="text-sm text-slate-700">
          <span className="font-medium text-indigo-600">Choose a PDF</span> or drag it here
        </span>
        <span className="text-xs text-slate-500">PDF only, up to 10 MB</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          disabled={disabled}
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </label>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
