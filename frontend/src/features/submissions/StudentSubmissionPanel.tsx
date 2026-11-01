import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MySubmission, Task } from '../../api/types';
import { FileDropzone } from '../../components/FileDropzone';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingState } from '../../components/ui/Spinner';
import { formatDateTime, isPast } from '../../lib/dates';
import { errorMessage, isApiError } from '../../lib/errors';
import { asPdf } from '../../lib/files';
import { taskKeys } from '../tasks/keys';
import { GradeSummary } from './GradeSummary';
import { useDeleteSubmission, useMySubmissions, useSubmitPdf } from './hooks';

/** The student's side of a task: upload, status, grade, delete. */
export function StudentSubmissionPanel({ task, now }: { task: Task; now: number }) {
  const mine = useMySubmissions({ taskId: task.id });
  const closed = isPast(task.deadline, now);
  const submission = mine.data?.[0];

  return (
    <Card>
      <CardHeader
        title="Your submission"
        actions={
          mine.isSuccess &&
          (submission ? (
            <Badge tone="sky">Submitted</Badge>
          ) : closed ? (
            <Badge tone="red">Not submitted</Badge>
          ) : (
            <Badge tone="amber">To do</Badge>
          ))
        }
      />
      <CardBody>
        {mine.isPending ? (
          <LoadingState className="py-6" />
        ) : mine.isError ? (
          <Alert tone="error">{errorMessage(mine.error)}</Alert>
        ) : submission ? (
          <SubmittedView submission={submission} closed={closed} />
        ) : closed ? (
          <p className="text-sm text-slate-600">
            The deadline has passed and you didn&apos;t hand anything in for this task.
          </p>
        ) : (
          <UploadForm taskId={task.id} />
        )}
      </CardBody>
    </Card>
  );
}

function UploadForm({ taskId }: { taskId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = useSubmitPdf(taskId);
  const queryClient = useQueryClient();

  const onSubmit = () => {
    if (!file) return;
    setError(null);
    submit.mutate(asPdf(file), {
      onSuccess: () => {
        setFile(null);
        toast.success('Submitted! Your teacher can now see your PDF.');
      },
      onError: (err) => {
        // The deadline may have passed or moved: reload the task. That can
        // swap this form out, so the reason also goes in a toast.
        if (isApiError(err, 400) || isApiError(err, 404)) {
          toast.error(errorMessage(err));
          void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
        } else {
          setError(errorMessage(err));
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Upload your work as a single PDF. You can hand in one file per task.</p>
      {error && <Alert tone="error">{error}</Alert>}
      <FileDropzone file={file} onFileChange={setFile} disabled={submit.isPending} />
      <Button onClick={onSubmit} disabled={!file} loading={submit.isPending} className="w-full">
        <Send aria-hidden="true" className="size-4" />
        {submit.isPending ? 'Uploading…' : 'Submit PDF'}
      </Button>
    </div>
  );
}

function SubmittedView({ submission, closed }: { submission: MySubmission; closed: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteSubmission();

  const onDelete = () =>
    remove.mutate(submission.id, {
      onSuccess: () => toast.success('Submission deleted. You can upload a new PDF before the deadline.'),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => setConfirming(false),
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Handed in{' '}
        <time dateTime={submission.submittedAt} className="font-medium text-slate-900">
          {formatDateTime(submission.submittedAt)}
        </time>
        .
      </p>

      <GradeSummary grade={submission.grade} feedback={submission.feedback} gradedAt={submission.gradedAt} />

      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/submissions/${submission.id}`} variant="secondary" size="sm">
          <Eye aria-hidden="true" className="size-4" />
          View PDF
        </ButtonLink>
        {!closed && (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-red-700">
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        )}
      </div>

      {closed ? (
        <p className="text-xs text-slate-500">The deadline has passed, so this submission can no longer change.</p>
      ) : (
        <p className="text-xs text-slate-500">
          Need to change your file? Delete this submission, then upload the new PDF before the deadline.
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete your submission?"
        confirmLabel="Delete submission"
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      >
        <p>Your PDF will be removed{submission.grade !== null ? ', along with its grade' : ''}.</p>
        <p>
          You can upload a new one until{' '}
          <span className="font-medium text-slate-900">{formatDateTime(submission.task.deadline)}</span>. If you
          don&apos;t, the task counts as not submitted.
        </p>
      </ConfirmDialog>
    </div>
  );
}
