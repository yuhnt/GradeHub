import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useCurrentUser } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/Spinner';
import { isPast, toDateTimeLocalValue } from '../../lib/dates';
import { useDocumentTitle } from '../../lib/hooks';
import { ForbiddenState, NotFoundState, QueryErrorState } from '../../pages/StatusPages';
import { useCreateTask, useTask, useUpdateTask } from './hooks';
import { TaskForm } from './TaskForm';
import { parseId } from '../../lib/params';

export function NewTaskPage() {
  useDocumentTitle('New task');
  const navigate = useNavigate();
  const createTask = useCreateTask();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New task"
        description="Students see the task as soon as you create it."
        back={{ to: '/tasks', label: 'Tasks' }}
      />
      <Card>
        <CardBody className="py-6">
          <TaskForm
            submitLabel="Create task"
            cancelTo="/tasks"
            onSubmit={async (input) => {
              const task = await createTask.mutateAsync(input);
              toast.success('Task created.');
              navigate(`/tasks/${task.id}`);
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export function EditTaskPage() {
  const id = parseId(useParams().taskId);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const task = useTask(id ?? 0, id !== null);
  const updateTask = useUpdateTask(id ?? 0);
  useDocumentTitle(task.data ? `Edit ${task.data.title}` : 'Edit task');

  if (id === null) return <NotFoundState title="Task not found" />;
  if (task.isPending) return <LoadingState />;
  if (task.isError) return <QueryErrorState error={task.error} notFoundTitle="Task not found" onRetry={task.refetch} />;
  if (task.data.createdBy !== user.id) {
    return <ForbiddenState description="Only the teacher who created this task can edit it." />;
  }

  const closed = isPast(task.data.deadline);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit task" back={{ to: `/tasks/${id}`, label: task.data.title }} />
      <Card>
        <CardBody className="py-6">
          <TaskForm
            defaultValues={{
              title: task.data.title,
              description: task.data.description,
              deadline: closed ? '' : toDateTimeLocalValue(task.data.deadline),
            }}
            notice={
              closed ? (
                <Alert tone="warning" title="This task's deadline has passed">
                  Saving requires a new deadline in the future, which reopens the task: students who haven&apos;t
                  submitted will be able to hand in again.
                </Alert>
              ) : (
                <Alert tone="info">
                  Changing the deadline applies straight away. An earlier deadline can lock out students who
                  haven&apos;t submitted yet.
                </Alert>
              )
            }
            submitLabel="Save changes"
            cancelTo={`/tasks/${id}`}
            onSubmit={async (input) => {
              await updateTask.mutateAsync(input);
              toast.success('Task updated.');
              navigate(`/tasks/${id}`);
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
