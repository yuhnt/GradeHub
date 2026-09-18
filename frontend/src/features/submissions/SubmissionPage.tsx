import { useNavigate, useParams } from 'react-router';
import { useCurrentUser } from '../../auth/AuthContext';
import { PdfPreview } from '../../components/PdfPreview';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/dates';
import { toFileName } from '../../lib/files';
import { useDocumentTitle } from '../../lib/hooks';
import { parseId } from '../../lib/params';
import { NotFoundState, QueryErrorState } from '../../pages/StatusPages';
import { useTask, useTaskSubmissions } from '../tasks/hooks';
import { GradeForm } from './GradeForm';
import { GradeSummary } from './GradeSummary';
import { useSubmission } from './hooks';

function toGradeLabel(ungraded: number) {
  if (ungraded === 0) return 'Every submission on this task has a grade.';
  return `${ungraded} submission${ungraded === 1 ? '' : 's'} on this task still to grade.`;
}

/**
 * One submission with its PDF. Teachers grade it here; students see their
 * own file and grade. Anyone else gets a 404 from the API.
 */
export function SubmissionPage() {
  const id = parseId(useParams().submissionId);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const isTeacher = user.role === 'teacher';

  const submission = useSubmission(id ?? 0);
  const taskId = submission.data?.taskId ?? 0;
  const task = useTask(taskId, submission.isSuccess);
  // The grading list names the student and tells us what is left to grade.
  const list = useTaskSubmissions(taskId, isTeacher && submission.isSuccess);

  const row = list.data?.submissions.find((s) => s.id === id);
  const studentName = row?.student.username;
  useDocumentTitle(studentName ? `${studentName}'s submission` : 'Submission');

  if (id === null) return <NotFoundState title="Submission not found" />;
  if (submission.isPending) return <LoadingState label="Loading submission…" />;
  if (submission.isError) {
    return <QueryErrorState error={submission.error} notFoundTitle="Submission not found" onRetry={submission.refetch} />;
  }

  const data = submission.data;
  const taskTitle = task.data?.title ?? 'Task';
  const nextUngraded = list.data?.submissions.find((s) => s.grade === null && s.id !== data.id);

  const heading = !isTeacher
    ? 'Your submission'
    : data.isTest
      ? 'Test upload'
      : studentName
        ? `${studentName}'s submission`
        : 'Submission';

  return (
    <>
      <PageHeader
        back={{ to: `/tasks/${data.taskId}`, label: taskTitle }}
        title={heading}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {data.isTest && <Badge tone="amber">Test upload: hidden from students</Badge>}
            <span>
              Handed in{' '}
              <time dateTime={data.submittedAt} className="font-medium text-slate-800">
                {formatDateTime(data.submittedAt)}
              </time>
              {row && <> by {row.student.email}</>}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardBody>
            <PdfPreview
              submissionId={data.id}
              fileName={toFileName([taskTitle, studentName ?? (isTeacher ? 'test' : user.username)])}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          {isTeacher ? (
            <Card>
              <CardHeader
                title="Grade"
                description={
                  list.isSuccess && !data.isTest && toGradeLabel(list.data.submissions.filter((s) => s.grade === null).length)
                }
              />
              <CardBody>
                {data.isTest && (
                  <Alert tone="info" className="mb-4">
                    Grading a test upload is allowed, but the grade is never shown to students.
                  </Alert>
                )}
                {/* Remount per submission so "grade next" starts from a clean form. */}
                <GradeForm
                  key={data.id}
                  submission={data}
                  onSaveAndNext={nextUngraded ? () => navigate(`/submissions/${nextUngraded.id}`) : undefined}
                />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Your grade" />
              <CardBody>
                <GradeSummary grade={data.grade} feedback={data.feedback} gradedAt={data.gradedAt} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
