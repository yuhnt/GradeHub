import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { auth, createUser, deleteUsersWithPrefix, futureDate, pastDate, pdf } from './helpers';

const app = createApp();
const PREFIX = 'tasktest_';

let teacher: Awaited<ReturnType<typeof createUser>>;
let otherTeacher: Awaited<ReturnType<typeof createUser>>;
let student: Awaited<ReturnType<typeof createUser>>;

const validTask = () => ({
  title: 'Essay 1',
  description: 'Write about databases',
  deadline: futureDate().toISOString(),
});

async function createTask(token = teacher.token) {
  const res = await request(app).post('/api/tasks').set(auth(token)).send(validTask());
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

beforeAll(async () => {
  await deleteUsersWithPrefix(PREFIX);
  teacher = await createUser(`${PREFIX}teacher`, 'teacher');
  otherTeacher = await createUser(`${PREFIX}teacher2`, 'teacher');
  student = await createUser(`${PREFIX}student`, 'student');
});

afterAll(async () => {
  await deleteUsersWithPrefix(PREFIX);
  await prisma.$disconnect();
});

describe('POST /api/tasks', () => {
  it('creates a task owned by the teacher', async () => {
    const res = await request(app).post('/api/tasks').set(auth(teacher.token)).send(validTask());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Essay 1', createdBy: Number(teacher.id) });
    expect(typeof res.body.id).toBe('number');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/tasks').send(validTask());
    expect(res.status).toBe(401);
  });

  it('rejects a student with 403', async () => {
    const res = await request(app).post('/api/tasks').set(auth(student.token)).send(validTask());
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not allowed to create task');
  });

  it('rejects a missing title with 400', async () => {
    const { title, ...body } = validTask();
    const res = await request(app).post('/api/tasks').set(auth(teacher.token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('title, description missing');
  });

  it('rejects a title over the max length with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(teacher.token))
      .send({ ...validTask(), title: 'x'.repeat(151) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('title, description too long');
  });

  it('rejects an invalid deadline format with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(teacher.token))
      .send({ ...validTask(), deadline: 'next friday' });
    expect(res.status).toBe(400);
  });

  it('rejects a deadline in the past with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(teacher.token))
      .send({ ...validTask(), deadline: pastDate().toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid deadline: deadline must later than now');
  });
});

describe('GET /api/tasks and /api/tasks/:id', () => {
  it('lets any authenticated user list tasks', async () => {
    const task = await createTask();
    const res = await request(app).get('/api/tasks?limit=100').set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.tasks.map((t: { id: number }) => t.id)).toContain(task.id);
  });

  it('paginates with page and limit', async () => {
    // Three tasks with distinct deadlines far in the future, so they sort last.
    const created = [];
    for (const days of [3650, 3651, 3652]) {
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(teacher.token))
        .send({ ...validTask(), deadline: futureDate(days).toISOString() });
      created.push(res.body.id);
    }

    const first = await request(app).get('/api/tasks?limit=2').set(auth(student.token));
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, limit: 2 });
    expect(first.body.tasks).toHaveLength(2);
    expect(first.body.totalPages).toBe(Math.ceil(first.body.total / 2));

    const last = await request(app)
      .get(`/api/tasks?limit=2&page=${first.body.totalPages}`)
      .set(auth(student.token));
    const lastIds = last.body.tasks.map((t: { id: number }) => t.id);
    expect(lastIds[lastIds.length - 1]).toBe(created[2]);
  });

  it('defaults to page 1 with 20 per page', async () => {
    const res = await request(app).get('/api/tasks').set(auth(student.token));
    expect(res.body).toMatchObject({ page: 1, limit: 20 });
  });

  it('rejects invalid page or limit with 400', async () => {
    for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=101', 'limit=2.5']) {
      const res = await request(app).get(`/api/tasks?${query}`).set(auth(student.token));
      expect(res.status).toBe(400);
    }
  });

  it('rejects listing without a token with 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('lets a student view any task', async () => {
    const task = await createTask();
    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app).get('/api/tasks/999999999').set(auth(student.token));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/tasks/abc').set(auth(student.token));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('lets the owner update title, description and deadline', async () => {
    const task = await createTask();
    const deadline = new Date(futureDate(30).setMilliseconds(0)).toISOString();
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set(auth(teacher.token))
      .send({ title: 'Essay 1 (revised)', description: 'Longer now', deadline });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Essay 1 (revised)', description: 'Longer now' });
    expect(res.body.deadline).toBe(deadline);
  });

  it("rejects another teacher with 403 (task existence isn't hidden)", async () => {
    const task = await createTask();
    const res = await request(app).put(`/api/tasks/${task.id}`).set(auth(otherTeacher.token)).send(validTask());
    expect(res.status).toBe(403);
  });

  it('rejects a student with 403', async () => {
    const task = await createTask();
    const res = await request(app).put(`/api/tasks/${task.id}`).set(auth(student.token)).send(validTask());
    expect(res.status).toBe(403);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app).put('/api/tasks/999999999').set(auth(teacher.token)).send(validTask());
    expect(res.status).toBe(404);
  });

  it('rejects a missing description with 400', async () => {
    const task = await createTask();
    const { description, ...body } = validTask();
    const res = await request(app).put(`/api/tasks/${task.id}`).set(auth(teacher.token)).send(body);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('rejects another teacher with 403', async () => {
    const task = await createTask();
    const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(otherTeacher.token));
    expect(res.status).toBe(403);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app).delete('/api/tasks/999999999').set(auth(teacher.token));
    expect(res.status).toBe(404);
  });

  it('deletes the task and cascades to its submissions', async () => {
    const task = await createTask();
    const submit = await request(app)
      .post('/api/submissions')
      .set(auth(student.token))
      .field('taskId', String(task.id))
      .attach('file', pdf.buffer, pdf.options);
    expect(submit.status).toBe(201);

    const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(teacher.token));
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('task deleted successful');

    expect(await prisma.task.findUnique({ where: { id: BigInt(task.id) } })).toBeNull();
    expect(await prisma.submission.findUnique({ where: { id: BigInt(submit.body.id) } })).toBeNull();
  });
});
