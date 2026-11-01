import type { Submission, Task, User } from '../api/types';

// In-memory stand-in for the backend's database, reset before every test.

export const teacher: User = { id: 1, username: 'drhossam', email: 'hossam@example.com', role: 'teacher' };
export const otherTeacher: User = { id: 2, username: 'mslan', email: 'lan@example.com', role: 'teacher' };
export const student: User = { id: 3, username: 'linh', email: 'linh@example.com', role: 'student' };
export const otherStudent: User = { id: 4, username: 'minh', email: 'minh@example.com', role: 'student' };

export const PASSWORD = 'SecurePass123';

const DAY = 24 * 60 * 60 * 1000;
export const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

interface Db {
  users: User[];
  passwords: Map<string, string>;
  tasks: Task[];
  submissions: Submission[];
  nextId: number;
}

export const db: Db = { users: [], passwords: new Map(), tasks: [], submissions: [], nextId: 100 };

export function resetDb() {
  db.users = [teacher, otherTeacher, student, otherStudent].map((u) => ({ ...u }));
  db.passwords = new Map(db.users.map((u) => [u.username, PASSWORD]));
  db.tasks = [];
  db.submissions = [];
  db.nextId = 100;
}

export function addTask(overrides: Partial<Task> = {}): Task {
  const task: Task = {
    id: db.nextId++,
    title: 'Lab report 1',
    description: 'Normalise the schema to 3NF and explain each step.',
    deadline: inDays(7),
    createdBy: teacher.id,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
  db.tasks.push(task);
  return task;
}

export function addSubmission(overrides: Partial<Submission> & Pick<Submission, 'taskId'>): Submission {
  const submission: Submission = {
    id: db.nextId++,
    userId: student.id,
    filePath: 'uploads/answer.pdf',
    submittedAt: new Date().toISOString(),
    grade: null,
    feedback: null,
    gradedAt: null,
    isTest: false,
    ...overrides,
  };
  db.submissions.push(submission);
  return submission;
}

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A JWT-shaped token the fake API and the app's decoder both understand. */
export function tokenFor(user: User, expiresInSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${base64url({ alg: 'none' })}.${base64url({ userId: String(user.id), role: user.role, exp })}.sig`;
}
