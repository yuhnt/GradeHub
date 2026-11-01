import fs from 'fs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { auth, createUser, deleteUsersWithPrefix, futureDate, pastDate, pdf } from './helpers';

const app = createApp();
const PREFIX = 'subtest_';

let teacher: Awaited<ReturnType<typeof createUser>>;
let otherTeacher: Awaited<ReturnType<typeof createUser>>;
let student: Awaited<ReturnType<typeof createUser>>;
let otherStudent: Awaited<ReturnType<typeof createUser>>;

// Created directly so a past deadline is possible (the API refuses those).
async function createTask(deadline = futureDate(), owner = teacher) {
  return prisma.task.create({
    data: { title: 'Lab report', description: 'Submit a PDF', deadline, createdBy: owner.id },
  });
}

function submit(token: string, taskId: bigint | number | string) {
  return request(app)
    .post('/api/submissions')
    .set(auth(token))
    .field('taskId', String(taskId))
    .attach('file', pdf.buffer, pdf.options);
}

beforeAll(async () => {
  await deleteUsersWithPrefix(PREFIX);
  teacher = await createUser(`${PREFIX}teacher`, 'teacher');
  otherTeacher = await createUser(`${PREFIX}teacher2`, 'teacher');
  student = await createUser(`${PREFIX}student`, 'student');
  otherStudent = await createUser(`${PREFIX}student2`, 'student');
});

afterAll(async () => {
  await deleteUsersWithPrefix(PREFIX);
  await prisma.$disconnect();
});

describe('POST /api/submissions', () => {
  it('stores the PDF and returns the submission', async () => {
    const task = await createTask();
    const res = await submit(student.token, task.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      taskId: Number(task.id),
      userId: Number(student.id),
      isTest: false,
    });
    expect(typeof res.body.submittedAt).toBe('string');
    expect(fs.existsSync(res.body.filePath)).toBe(true);
  });

  it('rejects a second active submission for the same task with 409', async () => {
    const task = await createTask();
    expect((await submit(student.token, task.id)).status).toBe(201);
    const res = await submit(student.token, task.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('submission already exists for this task');
  });

  it('rejects a submission after the deadline with 400 and keeps no file', async () => {
    const task = await createTask(pastDate());
    const before = fs.readdirSync(process.env.UPLOAD_DIR!).length;
    const res = await submit(student.token, task.id);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('deadline has passed');
    expect(fs.readdirSync(process.env.UPLOAD_DIR!).length).toBe(before);
  });

  it('rejects a teacher with 403', async () => {
    const task = await createTask();
    const res = await submit(teacher.token, task.id);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('only students can submit');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/submissions').field('taskId', '1');
    expect(res.status).toBe(401);
  });

  it('rejects a request with no file with 400', async () => {
    const task = await createTask();
    const res = await request(app)
      .post('/api/submissions')
      .set(auth(student.token))
      .field('taskId', String(task.id));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no file attached');
  });

  it('rejects a non-PDF file with 400', async () => {
    const task = await createTask();
    const res = await request(app)
      .post('/api/submissions')
      .set(auth(student.token))
      .field('taskId', String(task.id))
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('file must be a PDF');
  });

  it('rejects a missing taskId with 400', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set(auth(student.token))
      .attach('file', pdf.buffer, pdf.options);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskId missing');
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await submit(student.token, 999999999);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/submissions/:id', () => {
  it('lets the student view their own submission', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).get(`/api/submissions/${created.body.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.body.id, grade: null, feedback: null });
  });

  it("hides another student's submission behind 404", async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).get(`/api/submissions/${created.body.id}`).set(auth(otherStudent.token));
    expect(res.status).toBe(404);
  });

  it('lets the task owner view it, but not another teacher', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const owner = await request(app).get(`/api/submissions/${created.body.id}`).set(auth(teacher.token));
    expect(owner.status).toBe(200);
    const other = await request(app).get(`/api/submissions/${created.body.id}`).set(auth(otherTeacher.token));
    expect(other.status).toBe(404);
  });

  it('serves the PDF to someone allowed to see it', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).get(`/api/submissions/${created.body.id}/file`).set(auth(teacher.token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});

describe('DELETE /api/submissions/:id', () => {
  it('deletes the submission and its file, then allows resubmitting', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).delete(`/api/submissions/${created.body.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(fs.existsSync(created.body.filePath)).toBe(false);

    expect((await submit(student.token, task.id)).status).toBe(201);
  });

  it("hides another student's submission behind 404", async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).delete(`/api/submissions/${created.body.id}`).set(auth(otherStudent.token));
    expect(res.status).toBe(404);
  });

  it('rejects a teacher with 403', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    const res = await request(app).delete(`/api/submissions/${created.body.id}`).set(auth(teacher.token));
    expect(res.status).toBe(403);
  });

  it('rejects deleting once the deadline has passed with 400', async () => {
    const task = await createTask();
    const created = await submit(student.token, task.id);
    await prisma.task.update({ where: { id: task.id }, data: { deadline: pastDate() } });

    const res = await request(app).delete(`/api/submissions/${created.body.id}`).set(auth(student.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('deadline has passed');
  });
});

describe('teacher test submissions', () => {
  it('are unrestricted: several per task, even after the deadline', async () => {
    const task = await createTask(pastDate());
    for (let i = 0; i < 2; i++) {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/test-submission`)
        .set(auth(teacher.token))
        .attach('file', pdf.buffer, pdf.options);
      expect(res.status).toBe(201);
      expect(res.body.isTest).toBe(true);
    }
  });

  it("reject a teacher who didn't create the task with 403", async () => {
    const task = await createTask();
    const res = await request(app)
      .post(`/api/tasks/${task.id}/test-submission`)
      .set(auth(otherTeacher.token))
      .attach('file', pdf.buffer, pdf.options);
    expect(res.status).toBe(403);
  });

  it('reject a student with 403', async () => {
    const task = await createTask();
    const res = await request(app)
      .post(`/api/tasks/${task.id}/test-submission`)
      .set(auth(student.token))
      .attach('file', pdf.buffer, pdf.options);
    expect(res.status).toBe(403);
  });

  it('return 404 for a task that does not exist', async () => {
    const res = await request(app)
      .post('/api/tasks/999999999/test-submission')
      .set(auth(teacher.token))
      .attach('file', pdf.buffer, pdf.options);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tasks/:id/submissions', () => {
  it("lists the task's real submissions and leaves out test ones", async () => {
    const task = await createTask();
    const real = await submit(student.token, task.id);
    await request(app)
      .post(`/api/tasks/${task.id}/test-submission`)
      .set(auth(teacher.token))
      .attach('file', pdf.buffer, pdf.options);

    const res = await request(app).get(`/api/tasks/${task.id}/submissions`).set(auth(teacher.token));
    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe(Number(task.id));
    expect(res.body.submissions).toHaveLength(1);
    expect(res.body.submissions[0].id).toBe(real.body.id);
    // The grading list names the student, not just their id.
    expect(res.body.submissions[0].student).toEqual({
      id: Number(student.id),
      username: `${PREFIX}student`,
      email: `${PREFIX}student@example.com`,
    });
  });

  it("hides another teacher's task behind 404", async () => {
    const task = await createTask();
    const res = await request(app).get(`/api/tasks/${task.id}/submissions`).set(auth(otherTeacher.token));
    expect(res.status).toBe(404);
  });

  it('rejects a student with 403', async () => {
    const task = await createTask();
    const res = await request(app).get(`/api/tasks/${task.id}/submissions`).set(auth(student.token));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/submissions/mine', () => {
  it("lists only the student's own submissions, labelled with their task", async () => {
    const task = await createTask();
    const mine = await submit(student.token, task.id);
    const theirs = await submit(otherStudent.token, task.id);

    const res = await request(app).get('/api/submissions/mine').set(auth(student.token));
    expect(res.status).toBe(200);
    const ids = res.body.submissions.map((s: { id: number }) => s.id);
    expect(ids).toContain(mine.body.id);
    expect(ids).not.toContain(theirs.body.id);
    const found = res.body.submissions.find((s: { id: number }) => s.id === mine.body.id);
    expect(found.task).toEqual({ id: Number(task.id), title: 'Lab report', deadline: task.deadline.toISOString() });
    expect(found).toMatchObject({ grade: null, gradedAt: null, isTest: false });
  });

  it('narrows to one task with ?taskId', async () => {
    const task = await createTask();
    const other = await createTask();
    const created = await submit(student.token, task.id);
    await submit(student.token, other.id);

    const res = await request(app).get(`/api/submissions/mine?taskId=${task.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.submissions).toHaveLength(1);
    expect(res.body.submissions[0].id).toBe(created.body.id);
  });

  it('returns an empty list for a task with no submission from the student', async () => {
    const task = await createTask();
    const res = await request(app).get(`/api/submissions/mine?taskId=${task.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.submissions).toEqual([]);
  });

  it('rejects a non-numeric taskId with 400', async () => {
    const res = await request(app).get('/api/submissions/mine?taskId=abc').set(auth(student.token));
    expect(res.status).toBe(400);
  });

  it('rejects a teacher with 403', async () => {
    const res = await request(app).get('/api/submissions/mine').set(auth(teacher.token));
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/submissions/mine');
    expect(res.status).toBe(401);
  });
});
