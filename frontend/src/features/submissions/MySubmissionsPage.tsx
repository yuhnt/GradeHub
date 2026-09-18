import { Link } from 'react-router';
import { FileText } from 'lucide-react';
import { DeadlineBadge } from '../../components/DeadlineBadge';
import { GradeBadge } from '../../components/GradeBadge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/dates';
import { useDocumentTitle, useNow } from '../../lib/hooks';
import { QueryErrorState } from '../../pages/StatusPages';
import { useMySubmissions } from './hooks';

export function MySubmissionsPage() {
  useDocumentTitle('My submissions');
  const now = useNow();
  const mine = useMySubmissions();

  const graded = mine.data?.filter((s) => s.grade !== null) ?? [];
  const average = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length)
    : null;

  return (
    <>
      <PageHeader
        title="My submissions"
        description={
          mine.isSuccess && mine.data.length > 0
            ? `${mine.data.length} handed in · ${graded.length} graded${average !== null ? ` · average ${average} / 100` : ''}`
            : 'Everything you have handed in, with grades and feedback.'
        }
      />
      <Card>
        {mine.isPending ? (
          <LoadingState />
        ) : mine.isError ? (
          <div className="p-5">
            <QueryErrorState error={mine.error} notFoundTitle="Nothing found" onRetry={mine.refetch} />
          </div>
        ) : mine.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing handed in yet"
            description="When you submit a PDF for a task, it shows up here with its grade."
            action={<ButtonLink to="/tasks">See open tasks</ButtonLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Task
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Handed in
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
                {mine.data.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/tasks/${s.task.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                          {s.task.title}
                        </Link>
                        <DeadlineBadge deadline={s.task.deadline} now={now} />
                      </div>
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
                        variant="secondary"
                        size="sm"
                        aria-label={`View your submission for ${s.task.title}`}
                      >
                        View
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
