// Response and request shapes of the backend API (see docs/api.md).
// Ids are numbers; timestamps are ISO 8601 strings in UTC.

export type Role = 'student' | 'teacher';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  createdBy: number;
  createdAt: string;
}

export type TaskStatusFilter = 'all' | 'open' | 'closed';

export interface TaskListParams {
  page: number;
  limit: number;
  status: TaskStatusFilter;
  mine: boolean;
}

export interface TaskPage {
  tasks: Task[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskInput {
  title: string;
  description: string;
  deadline: string;
}

export interface Submission {
  id: number;
  taskId: number;
  userId: number;
  filePath: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
  isTest: boolean;
}

export interface StudentRef {
  id: number;
  username: string;
  email: string;
}

/** A row of GET /api/tasks/:id/submissions (teacher view). */
export interface TaskSubmission extends Submission {
  student: StudentRef;
}

export interface TaskSubmissions {
  task: Pick<Task, 'id' | 'title' | 'description' | 'deadline'>;
  submissions: TaskSubmission[];
}

/** A row of GET /api/submissions/mine (student view). */
export interface MySubmission extends Submission {
  task: Pick<Task, 'id' | 'title' | 'deadline'>;
}

export interface GradeInput {
  grade: number;
  feedback: string | null;
}

export interface GradeResult {
  submissionId: number;
  grade: number;
  feedback: string | null;
  gradedAt: string;
}
