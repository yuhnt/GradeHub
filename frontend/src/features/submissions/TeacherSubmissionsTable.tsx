import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { FileDown, Inbox } from 'lucide-react';
import type { Task, TaskSubmissions } from '../../api/types';
import { GradeBadge } from '../../components/GradeBadge';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { downloadCsv, toFileName } from '../../lib/files';

type Filter = 'all' | 'ungraded';

interface TeacherSubmissionsTableProps {
  task: Task;
  query: UseQueryResult<TaskSubmissions>;
}

/** Every real (non-test) submission on the teacher's task. */
export function TeacherSubmissionsTable({ task, query }: TeacherSubmissionsTableProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const rows = query.data?.submissions ?? [];
  const graded = rows.filter((s) => s.grade !== null).length;
  const visible = filter === 'ungraded' ? rows.filter((s) => s.grade === null) : rows;

  const exportCsv = () =>
    downloadCsv(
      [
        ['Student', 'Email', 'Submitted at (UTC)', 'Grade', 'Feedback', 'Graded at (UTC)'],
        ...rows.map((s) => [s.student.username, s.student.email, s.submittedAt, s.grade, s.feedback, s.gradedAt]),
      ],
      toFileName([task.title, 'grades'], 'csv'),
    );

  return (
    <Card>
      <CardHeader
        title="Submissions"
        description={
          query.isSuccess &&
          (rows.length === 0
            ? 'No one has submitted yet.'
            : `${rows.length} submitted · ${graded} graded · ${rows.length - graded} to grade`)
        }
        actions={
          rows.length > 0 && (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                Show
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as Filter)}
                  className="rounded-md border-0 py-1.5 pr-8 pl-3 text-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="all">All</option>
                  <option value="ungraded">Not graded</option>
                </select>
              </label>
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                <FileDown aria-hidden="true" className="size-4" />
                Export CSV
              </Button>
            </>
          )
        }
      />
      {query.isPending ? (
        <LoadingState label="Loading submissions…" />
      ) : query.isError ? (
        <div className="p-5">
          <Alert tone="error">{errorMessage(query.error)}</Alert>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No submissions yet"
          description="Students' PDFs appear here as they hand them in."
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={Inbox} title="Everything is graded" description="Every submission has a grade." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Student
                </th>
                <th scope="col" className="px-5 py-3">
                  Submitted
                </th>
                <th scope="col" className="px-5 py-3">
                  Grade
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{s.student.username}</p>
                    <p className="text-slate-500">{s.student.email}</p>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                    <time dateTime={s.submittedAt}>{formatDateTime(s.submittedAt)}</time>
                  </td>
                  <td className="px-5 py-3">
                    <GradeBadge grade={s.grade} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ButtonLink
                      to={`/submissions/${s.id}`}
                      variant={s.grade === null ? 'primary' : 'secondary'}
                      size="sm"
                      className="whitespace-nowrap"
                      aria-label={`${s.grade === null ? 'Grade' : 'Review'} ${s.student.username}'s submission`}
                    >
                      {s.grade === null ? 'Grade' : 'Review'}
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
