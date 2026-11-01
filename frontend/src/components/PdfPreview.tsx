import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { downloadBlob } from '../lib/files';
import { errorMessage } from '../lib/errors';
import { useSubmissionFile } from '../features/submissions/hooks';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { LoadingState } from './ui/Spinner';

interface PdfPreviewProps {
  submissionId: number;
  fileName: string;
  className?: string;
}

/**
 * Shows a submitted PDF inline. The file needs the Authorization header, so
 * it is fetched as a blob and shown through an object URL.
 */
export function PdfPreview({ submissionId, fileName, className }: PdfPreviewProps) {
  const file = useSubmissionFile(submissionId);

  if (file.isPending) return <LoadingState label="Loading PDF…" />;
  if (file.isError) {
    return (
      <Alert tone="error" title="The PDF couldn't be loaded">
        {errorMessage(file.error)}
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <BlobFrame blob={file.data} title={fileName} className={className} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Preview not showing? Your browser may not display PDFs inline.</span>
        <Button variant="secondary" size="sm" onClick={() => downloadBlob(file.data, fileName)}>
          <Download aria-hidden="true" className="size-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

function BlobFrame({ blob, title, className }: { blob: Blob; title: string; className?: string | undefined }) {
  const ref = useRef<HTMLIFrameElement>(null);

  // The URL is created and revoked in the same effect so a remount (e.g.
  // React StrictMode) never leaves the frame pointing at a revoked URL.
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <iframe
      ref={ref}
      title={`PDF preview: ${title}`}
      className={className ?? 'h-[75vh] min-h-96 w-full rounded-md bg-slate-100 ring-1 ring-slate-200'}
    />
  );
}
