import { useState } from 'react';
import { Link } from 'react-router';
import { FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import type { Submission } from '../../api/types';
import { FileDropzone } from '../../components/FileDropzone';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { formatDateTime } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { asPdf } from '../../lib/files';
import { useUploadTestSubmission } from '../tasks/hooks';

/**
 * Lets the owning teacher try the hand-in flow (decision 6: no deadline,
 * no limit). Test uploads never reach students or the grading list.
 */
export function TestSubmissionPanel({ taskId }: { taskId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The API can't list test uploads, so only this visit's are shown.
  const [uploads, setUploads] = useState<Submission[]>([]);
  const upload = useUploadTestSubmission(taskId);

  const onUpload = () => {
    if (!file) return;
    setError(null);
    upload.mutate(asPdf(file), {
      onSuccess: (submission) => {
        setUploads((prev) => [submission, ...prev]);
        setFile(null);
        toast.success('Test PDF uploaded.');
      },
      onError: (err) => setError(errorMessage(err)),
    });
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FlaskConical aria-hidden="true" className="size-4 text-slate-500" />
            Try it as a student
          </span>
        }
        description="Upload a sample PDF to check the task. Students never see test uploads."
      />
      <CardBody className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FileDropzone file={file} onFileChange={setFile} disabled={upload.isPending} label="Test PDF" />
        <Button variant="secondary" onClick={onUpload} disabled={!file} loading={upload.isPending} className="w-full">
          Upload test PDF
        </Button>
        {uploads.length > 0 && (
          <ul className="space-y-1 text-sm">
            {uploads.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Uploaded {formatDateTime(s.submittedAt)}</span>
                <Link to={`/submissions/${s.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
