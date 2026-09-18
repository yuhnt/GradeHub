import { http, HttpResponse } from 'msw';
import type { Submission, Task, User } from '../api/types';
import { decodeJwt } from '../auth/jwt';
import { db, tokenFor } from './db';

// A fake of the backend API with the same rules and error messages, so
// component tests exercise real request/response flows.

const api = (path: string) => `*/api${path}`;
const error = (status: number, message: string) => HttpResponse.json({ error: message }, { status });

function currentUser(request: Request): User | undefined {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  const claims = token ? decodeJwt(token) : null;
  if (!claims?.userId || (claims.exp && claims.exp * 1000 < Date.now())) return undefined;
  return db.users.find((u) => String(u.id) === claims.userId);
}

const isPast = (task: Task) => Date.now() > new Date(task.deadline).getTime();
const summary = (task: Task) => ({ id: task.id, title: task.title, deadline: task.deadline });
const findTask = (id: string | readonly string[] | undefined) => db.tasks.find((t) => String(t.id) === id);
const findSubmission = (id: string | readonly string[] | undefined) =>
  db.submissions.find((s) => String(s.id) === id);

function visibleTo(user: User, submission: Submission) {
  const task = db.tasks.find((t) => t.id === submission.taskId);
  return user.role === 'student'
    ? submission.userId === user.id && !submission.isTest
    : task?.createdBy === user.id;
}

/** 401 unless signed in, like the backend's authenticate middleware. */
function withUser(handler: (user: User, request: Request, params: Record<string, string>) => Response | Promise<Response>) {
  return ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    const user = currentUser(request);
    if (!user) return error(401, request.headers.has('Authorization') ? 'invalid or expired token' : 'authentication required');
    return handler(user, request, params as Record<string, string>);
  };
}

export const handlers = [
  http.post(api('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    const user = db.users.find((u) => u.username === body.username);
    if (!user || db.passwords.get(user.username) !== body.password) return error(401, 'invalid username or password');
    return HttpResponse.json({ token: tokenFor(user) });
  }),

  http.get(api('/auth/me'), withUser((user) => HttpResponse.json(user))),

  http.post(api('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as { username: string; email: string; password: string };
    if (db.users.some((u) => u.username === body.username)) return error(409, 'username already taken');
    if (db.users.some((u) => u.email === body.email)) return error(409, 'email already registered');
    const user: User = { id: db.nextId++, username: body.username, email: body.email, role: 'student' };
    db.users.push(user);
    db.passwords.set(user.username, body.password);
    return HttpResponse.json({ ...user, id: String(user.id) }, { status: 201 });
  }),

  http.post(api('/auth/forgot-password'), () =>
    HttpResponse.json({ message: 'If that email exists, a reset link has been sent' }),
  ),

  http.post(api('/auth/reset-password'), async ({ request }) => {
    const body = (await request.json()) as { token: string };
    if (body.token !== 'valid-reset-token') return error(400, 'invalid or expired token');
    return HttpResponse.json({ message: 'password reset successful' });
  }),

  http.get(
    api('/tasks'),
    withUser((user, request) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const status = url.searchParams.get('status') ?? 'all';
      let tasks = db.tasks.filter((t) => url.searchParams.get('mine') !== 'true' || t.createdBy === user.id);
      if (status === 'open') tasks = tasks.filter((t) => !isPast(t));
      if (status === 'closed') tasks = tasks.filter(isPast);
      const sign = status === 'closed' ? -1 : 1;
      tasks = [...tasks].sort((a, b) => sign * (Date.parse(a.deadline) - Date.parse(b.deadline)));
      return HttpResponse.json({
        tasks: tasks.slice((page - 1) * limit, page * limit),
        page,
        limit,
        total: tasks.length,
        totalPages: Math.ceil(tasks.length / limit),
      });
    }),
  ),

  http.post(
    api('/tasks'),
    withUser(async (user, request) => {
      if (user.role !== 'teacher') return error(403, 'not allowed to create task');
      const body = (await request.json()) as Pick<Task, 'title' | 'description' | 'deadline'>;
      const task: Task = { id: db.nextId++, ...body, createdBy: user.id, createdAt: new Date().toISOString() };
      db.tasks.push(task);
      return HttpResponse.json(task, { status: 201 });
    }),
  ),

  http.get(
    api('/tasks/:id'),
    withUser((_user, _request, params) => {
      const task = findTask(params.id);
      return task ? HttpResponse.json(task) : error(404, 'task not found');
    }),
  ),

  http.put(
    api('/tasks/:id'),
    withUser(async (user, request, params) => {
      const task = findTask(params.id);
      if (!task) return error(404, 'task not found');
      if (task.createdBy !== user.id) return error(403, 'not allowed to update task');
      Object.assign(task, await request.json());
      return HttpResponse.json(task);
    }),
  ),

  http.delete(
    api('/tasks/:id'),
    withUser((user, _request, params) => {
      const task = findTask(params.id);
      if (!task) return error(404, 'task not found');
      if (task.createdBy !== user.id) return error(403, 'forbidden');
      db.tasks = db.tasks.filter((t) => t !== task);
      db.submissions = db.submissions.filter((s) => s.taskId !== task.id);
      return HttpResponse.json({ msg: 'task deleted successful' });
    }),
  ),

  http.get(
    api('/tasks/:id/submissions'),
    withUser((user, _request, params) => {
      if (user.role !== 'teacher') return error(403, 'only teacher can view');
      const task = findTask(params.id);
      if (!task || task.createdBy !== user.id) return error(404, 'task not found, or you did not create this task');
      const submissions = db.submissions
        .filter((s) => s.taskId === task.id && !s.isTest)
        .map((s) => {
          const u = db.users.find((candidate) => candidate.id === s.userId)!;
          return { ...s, student: { id: u.id, username: u.username, email: u.email } };
        });
      return HttpResponse.json({ task: { ...summary(task), description: task.description }, submissions });
    }),
  ),

  http.post(
    api('/tasks/:id/test-submission'),
    withUser((user, _request, params) => {
      const task = findTask(params.id);
      if (!task) return error(404, 'task not found');
      if (task.createdBy !== user.id) return error(403, 'you did not create this task');
      const submission = newSubmission(user.id, task.id, true);
      return HttpResponse.json(submission, { status: 201 });
    }),
  ),

  http.get(
    api('/submissions/mine'),
    withUser((user, request) => {
      if (user.role !== 'student') return error(403, 'only students have their own submissions');
      const taskId = new URL(request.url).searchParams.get('taskId');
      const submissions = db.submissions
        .filter((s) => s.userId === user.id && !s.isTest && (!taskId || String(s.taskId) === taskId))
        .map((s) => ({ ...s, task: summary(db.tasks.find((t) => t.id === s.taskId)!) }));
      return HttpResponse.json({ submissions });
    }),
  ),

  http.post(
    api('/submissions'),
    withUser(async (user, request) => {
      if (user.role !== 'student') return error(403, 'only students can submit');
      const form = await request.formData();
      const task = findTask(String(form.get('taskId')));
      if (!task) return error(404, 'task not found');
      if (isPast(task)) return error(400, 'deadline has passed');
      if (db.submissions.some((s) => s.userId === user.id && s.taskId === task.id && !s.isTest)) {
        return error(409, 'submission already exists for this task');
      }
      return HttpResponse.json(newSubmission(user.id, task.id, false), { status: 201 });
    }),
  ),

  http.get(
    api('/submissions/:id'),
    withUser((user, _request, params) => {
      const submission = findSubmission(params.id);
      if (!submission || !visibleTo(user, submission)) return error(404, 'submission not found');
      return HttpResponse.json(submission);
    }),
  ),

  http.get(
    api('/submissions/:id/file'),
    withUser((user, _request, params) => {
      const submission = findSubmission(params.id);
      if (!submission || !visibleTo(user, submission)) return error(404, 'submission not found');
      // A string body: jsdom's Blob can't be streamed by Node's fetch.
      return new HttpResponse('%PDF-1.4 test file', { headers: { 'Content-Type': 'application/pdf' } });
    }),
  ),

  http.delete(
    api('/submissions/:id'),
    withUser((user, _request, params) => {
      if (user.role !== 'student') return error(403, 'only students allowed to delete');
      const submission = findSubmission(params.id);
      if (!submission || submission.userId !== user.id) return error(404, 'submission not found');
      const task = db.tasks.find((t) => t.id === submission.taskId)!;
      if (isPast(task)) return error(400, 'deadline has passed');
      db.submissions = db.submissions.filter((s) => s !== submission);
      return HttpResponse.json({ msg: 'Submissions deleted' });
    }),
  ),

  http.patch(
    api('/submissions/:id/grade'),
    withUser(async (user, request, params) => {
      if (user.role !== 'teacher') return error(403, 'only teachers can grade submissions');
      const submission = findSubmission(params.id);
      if (!submission || !visibleTo(user, submission)) return error(404, 'submission not found');
      const body = (await request.json()) as { grade: number; feedback: string | null };
      Object.assign(submission, { grade: body.grade, feedback: body.feedback, gradedAt: new Date().toISOString() });
      return HttpResponse.json({ ...body, submissionId: submission.id, gradedAt: submission.gradedAt });
    }),
  ),
];

function newSubmission(userId: number, taskId: number, isTest: boolean): Submission {
  const submission: Submission = {
    id: db.nextId++,
    userId,
    taskId,
    filePath: `uploads/${Date.now()}.pdf`,
    submittedAt: new Date().toISOString(),
    grade: null,
    feedback: null,
    gradedAt: null,
    isTest,
  };
  db.submissions.push(submission);
  return submission;
}
