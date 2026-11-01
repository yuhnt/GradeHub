import { Link, useSearchParams } from 'react-router';
import { ClipboardList, Plus } from 'lucide-react';
import type { MySubmission, Task, TaskStatusFilter, User } from '../../api/types';
import { useCurrentUser } from '../../auth/AuthContext';
import { DeadlineBadge, DeadlineText } from '../../components/DeadlineBadge';
import { GradeBadge } from '../../components/GradeBadge';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingState } from '../../components/ui/Spinner';
import { cn } from '../../lib/cn';
import { isPast } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { useDocumentTitle, useNow } from '../../lib/hooks';
import { useMySubmissions } from '../submissions/hooks';
import { useTaskList } from './hooks';

export const TASKS_PER_PAGE = 10;

const STATUS_TABS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

function parseStatus(value: string | null): TaskStatusFilter {
  return value === 'closed' || value === 'all' ? value : 'open';
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function TaskListPage() {
  useDocumentTitle('Tasks');
  const user = useCurrentUser();
  const isTeacher = user.role === 'teacher';
  const now = useNow();
  const [params, setParams] = useSearchParams();

  const status = parseStatus(params.get('status'));
  const page = parsePage(params.get('page'));
  // Teachers start on their own tasks; students always see every task.
  const mine = isTeacher && params.get('scope') !== 'all';

  const tasks = useTaskList({ page, limit: TASKS_PER_PAGE, status, mine });
  const mySubmissions = useMySubmissions({ enabled: !isTeacher });
  const submissionByTask = new Map((mySubmissions.data ?? []).map((s) => [s.taskId, s]));

  const update = (changes: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      // A new filter starts from the first page.
      if (!('page' in changes)) next.delete('page');
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          isTeacher
            ? 'Post tasks, then review and grade what students hand in.'
            : 'Hand in a PDF for each task before its deadline.'
        }
        actions={
          isTeacher && (
            <ButtonLink to="/tasks/new">
              <Plus aria-hidden="true" className="size-4" />
              New task
            </ButtonLink>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div role="group" aria-label="Filter by status" className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={status === tab.value}
                onClick={() => update({ status: tab.value === 'open' ? null : tab.value })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  status === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {isTeacher && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Show
              <select
                value={mine ? 'mine' : 'all'}
                onChange={(event) => update({ scope: event.target.value === 'all' ? 'all' : null })}
                className="rounded-md border-0 py-1.5 pr-8 pl-3 text-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-indigo-600"
              >
                <option value="mine">My tasks</option>
                <option value="all">All teachers&apos; tasks</option>
              </select>
            </label>
          )}
        </div>

        {tasks.isPending ? (
          <LoadingState label="Loading tasks…" />
        ) : tasks.isError ? (
          <div className="p-5">
            <Alert
              tone="error"
              title="Tasks couldn't be loaded"
              action={
                <Button variant="secondary" size="sm" onClick={() => tasks.refetch()}>
                  Try again
                </Button>
              }
            >
              {errorMessage(tasks.error)}
            </Alert>
          </div>
        ) : tasks.data.tasks.length === 0 ? (
          <EmptyTasks status={status} isTeacher={isTeacher} mine={mine} pageOutOfRange={page > 1} onReset={() => update({ page: null })} />
        ) : (
          <>
            <ul className={cn('divide-y divide-slate-200', tasks.isPlaceholderData && 'opacity-60')}>
              {tasks.data.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  user={user}
                  now={now}
                  showOwner={isTeacher && !mine}
                  submission={submissionByTask.get(task.id)}
                  submissionsLoaded={mySubmissions.isSuccess}
                />
              ))}
            </ul>
            <Pagination
              page={tasks.data.page}
              totalPages={tasks.data.totalPages}
              total={tasks.data.total}
              onPageChange={(next) => update({ page: next === 1 ? null : String(next) })}
            />
          </>
        )}
      </Card>
    </>
  );
}

interface TaskRowProps {
  task: Task;
  user: User;
  now: number;
  showOwner: boolean;
  submission: MySubmission | undefined;
  submissionsLoaded: boolean;
}

function TaskRow({ task, user, now, showOwner, submission, submissionsLoaded }: TaskRowProps) {
  return (
    <li className="relative px-5 py-4 hover:bg-slate-50">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/tasks/${task.id}`} className="font-medium break-words text-slate-900 hover:text-indigo-700">
              {/* The whole row is clickable; the link text stays the accessible name. */}
              <span aria-hidden="true" className="absolute inset-0" />
              {task.title}
            </Link>
            <DeadlineBadge deadline={task.deadline} now={now} />
            {showOwner && task.createdBy === user.id && <Badge tone="indigo">Yours</Badge>}
          </div>
          <p className="line-clamp-2 text-sm text-slate-600">{task.description}</p>
          <p className="text-sm text-slate-600">
            <DeadlineText deadline={task.deadline} now={now} />
          </p>
        </div>
        {user.role === 'student' && submissionsLoaded && (
          <StudentStatus submission={submission} closed={isPast(task.deadline, now)} />
        )}
      </div>
    </li>
  );
}

function StudentStatus({ submission, closed }: { submission: MySubmission | undefined; closed: boolean }) {
  if (submission) {
    return submission.grade !== null ? <GradeBadge grade={submission.grade} /> : <Badge tone="sky">Submitted</Badge>;
  }
  return closed ? <Badge tone="red">Not submitted</Badge> : <Badge tone="amber">To do</Badge>;
}

interface EmptyTasksProps {
  status: TaskStatusFilter;
  isTeacher: boolean;
  mine: boolean;
  pageOutOfRange: boolean;
  onReset: () => void;
}

function EmptyTasks({ status, isTeacher, mine, pageOutOfRange, onReset }: EmptyTasksProps) {
  if (pageOutOfRange) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nothing on this page"
        action={
          <Button variant="secondary" onClick={onReset}>
            Go to the first page
          </Button>
        }
      />
    );
  }
  const copy: Record<TaskStatusFilter, { title: string; description: string }> = {
    open: {
      title: 'No open tasks',
      description: isTeacher
        ? mine
          ? 'Tasks you create show up here until their deadline passes.'
          : 'No teacher has a task open right now.'
        : "You're all caught up. New tasks from your teachers will show up here.",
    },
    closed: { title: 'No closed tasks', description: 'Tasks move here once their deadline has passed.' },
    all: {
      title: 'No tasks yet',
      description: isTeacher ? 'Create your first task to start collecting submissions.' : 'No tasks have been posted yet.',
    },
  };
  return (
    <EmptyState
      icon={ClipboardList}
      title={copy[status].title}
      description={copy[status].description}
      action={
        isTeacher &&
        status !== 'closed' && (
          <ButtonLink to="/tasks/new">
            <Plus aria-hidden="true" className="size-4" />
            New task
          </ButtonLink>
        )
      }
    />
  );
}
