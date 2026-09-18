import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '../../auth/AuthContext';
import { DeadlineBadge, DeadlineText } from '../../components/DeadlineBadge';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { useDocumentTitle, useNow } from '../../lib/hooks';
import { parseId } from '../../lib/params';
import { NotFoundState, QueryErrorState } from '../../pages/StatusPages';
import { StudentSubmissionPanel } from '../submissions/StudentSubmissionPanel';
import { TeacherSubmissionsTable } from '../submissions/TeacherSubmissionsTable';
import { TestSubmissionPanel } from '../submissions/TestSubmissionPanel';
import { useDeleteTask, useTask, useTaskSubmissions } from './hooks';

export function TaskDetailPage() {
  const id = parseId(useParams().taskId);
  const user = useCurrentUser();
  const now = useNow();
  const task = useTask(id ?? 0, id !== null);
  const isOwner = user.role === 'teacher' && task.data?.createdBy === user.id;
  const submissions = useTaskSubmissions(id ?? 0, isOwner);
  useDocumentTitle(task.data?.title ?? 'Task');

  if (id === null) return <NotFoundState title="Task not found" />;
  if (task.isPending) return <LoadingState label="Loading task…" />;
  if (task.isError) {
    return (
      <QueryErrorState
        error={task.error}
        notFoundTitle="Task not found"
        notFoundDescription="It may have been deleted by its teacher."
        onRetry={task.refetch}
      />
    );
  }

  const data = task.data;

  return (
    <>
      <PageHeader
        back={{ to: '/tasks', label: 'Tasks' }}
        title={data.title}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <DeadlineBadge deadline={data.deadline} now={now} />
            <DeadlineText deadline={data.deadline} now={now} />
          </div>
        }
        actions={
          isOwner && (
            <>
              <ButtonLink to={`/tasks/${data.id}/edit`} variant="secondary">
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </ButtonLink>
              <DeleteTaskButton
                taskId={data.id}
                title={data.title}
                submissionCount={submissions.data?.submissions.length}
              />
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Instructions" description={`Posted ${formatDateTime(data.createdAt)}`} />
          <CardBody>
            <p className="text-sm leading-6 break-words whitespace-pre-wrap text-slate-700">{data.description}</p>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {user.role === 'student' && <StudentSubmissionPanel task={data} now={now} />}
          {isOwner && <TestSubmissionPanel taskId={data.id} />}
          {user.role === 'teacher' && !isOwner && (
            <Alert tone="info" title="Another teacher's task">
              Only the teacher who created this task can see and grade its submissions.
            </Alert>
          )}
        </div>

        {isOwner && (
          <div className="lg:col-span-3">
            <TeacherSubmissionsTable task={data} query={submissions} />
          </div>
        )}
      </div>
    </>
  );
}

function DeleteTaskButton({
  taskId,
  title,
  submissionCount,
}: {
  taskId: number;
  title: string;
  submissionCount: number | undefined;
}) {
  const [open, setOpen] = useState(false);
  const deleteTask = useDeleteTask();
  const navigate = useNavigate();

  const confirm = () =>
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success(`"${title}" was deleted.`);
        navigate('/tasks', { replace: true });
      },
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => setOpen(false),
    });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="text-red-700">
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete this task?"
        confirmLabel="Delete task"
        loading={deleteTask.isPending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <p>
          <span className="font-medium text-slate-900">{title}</span> will be removed for everyone.
        </p>
        <p className="font-medium text-red-700">
          {submissionCount === undefined
            ? 'All of its submissions, grades and uploaded PDFs will be deleted too.'
            : submissionCount === 0
              ? 'No student has submitted yet.'
              : `${submissionCount} student submission${submissionCount === 1 ? '' : 's'}, with grades and PDFs, will be deleted too.`}{' '}
          This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
