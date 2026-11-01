import { formatDateTime } from '../../lib/dates';

interface GradeSummaryProps {
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

/** Read-only grade and feedback, as a student sees it. */
export function GradeSummary({ grade, feedback, gradedAt }: GradeSummaryProps) {
  if (grade === null) {
    return (
      <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200 ring-inset">
        Not graded yet. Your grade and feedback will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md bg-indigo-50 px-4 py-3 ring-1 ring-indigo-200 ring-inset">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-indigo-900">Grade</p>
        <p className="text-2xl font-semibold text-indigo-900">
          {grade}
          <span className="text-base font-normal text-indigo-700"> / 100</span>
        </p>
      </div>
      {feedback ? (
        <div>
          <p className="text-sm font-medium text-indigo-900">Feedback</p>
          <p className="mt-1 text-sm break-words whitespace-pre-wrap text-indigo-950">{feedback}</p>
        </div>
      ) : (
        <p className="text-sm text-indigo-800">No written feedback.</p>
      )}
      {gradedAt && <p className="text-xs text-indigo-700">Graded {formatDateTime(gradedAt)}</p>}
    </div>
  );
}
