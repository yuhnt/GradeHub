import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { auth, createUser, deleteUsersWithPrefix, futureDate, pdf } from './helpers';

const app = createApp();
const PREFIX = 'gradetest_';

let teacher: Awaited<ReturnType<typeof createUser>>;
let otherTeacher: Awaited<ReturnType<typeof createUser>>;
let student: Awaited<ReturnType<typeof createUser>>;
let otherStudent: Awaited<ReturnType<typeof createUser>>;

async function createSubmission() {
  const task = await prisma.task.create({
    data: { title: 'Quiz', description: 'Answer everything', deadline: futureDate(), createdBy: teacher.id },
  });
  const res = await request(app)
    .post('/api/submissions')
    .set(auth(student.token))
    .field('taskId', String(task.id))
    .attach('file', pdf.buffer, pdf.options);
  expect(res.status).toBe(201);
  return res.body as { id: number };
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

describe('PATCH /api/submissions/:id/grade', () => {
  it('saves grade, feedback and gradedAt', async () => {
    const submission = await createSubmission();
    const res = await request(app)
      .patch(`/api/submissions/${submission.id}/grade`)
      .set(auth(teacher.token))
      .send({ grade: 85, feedback: 'Good work' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ submissionId: submission.id, grade: 85, feedback: 'Good work' });
    expect(typeof res.body.gradedAt).toBe('string');
  });

  it('lets the teacher overwrite an existing grade', async () => {
    const submission = await createSubmission();
    await request(app).patch(`/api/submissions/${submission.id}/grade`).set(auth(teacher.token)).send({ grade: 50 });
    const res = await request(app)
      .patch(`/api/submissions/${submission.id}/grade`)
      .set(auth(teacher.token))
      .send({ grade: 70, feedback: 'Regraded' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ grade: 70, feedback: 'Regraded' });
  });

  it('rejects a missing or non-integer grade with 400', async () => {
    const submission = await createSubmission();
    for (const body of [{}, { grade: 'A' }, { grade: 88.5 }]) {
      const res = await request(app).patch(`/api/submissions/${submission.id}/grade`).set(auth(teacher.token)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('grade is required and must be an integer');
    }
  });

  it('rejects a grade outside 0-100 with 400', async () => {
    const submission = await createSubmission();
    for (const grade of [-1, 101]) {
      const res = await request(app).patch(`/api/submissions/${submission.id}/grade`).set(auth(teacher.token)).send({ grade });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('grade must be between 0 and 100');
    }
  });

  it('rejects a student with 403', async () => {
    const submission = await createSubmission();
    const res = await request(app).patch(`/api/submissions/${submission.id}/grade`).set(auth(student.token)).send({ grade: 100 });
    expect(res.status).toBe(403);
  });

  it("hides another teacher's submission behind 404", async () => {
    const submission = await createSubmission();
    const res = await request(app)
      .patch(`/api/submissions/${submission.id}/grade`)
      .set(auth(otherTeacher.token))
      .send({ grade: 10 });
    expect(res.status).toBe(404);
  });

  it('returns 404 for a submission that does not exist', async () => {
    const res = await request(app).patch('/api/submissions/999999999/grade').set(auth(teacher.token)).send({ grade: 10 });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/submissions/:id/grade', () => {
  it('returns graded: false for an ungraded submission', async () => {
    const submission = await createSubmission();
    const res = await request(app).get(`/api/submissions/${submission.id}/grade`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ submissionId: submission.id, graded: false, grade: null, feedback: null, gradedAt: null });
  });

  it('shows the grade to the student and the task owner', async () => {
    const submission = await createSubmission();
    await request(app)
      .patch(`/api/submissions/${submission.id}/grade`)
      .set(auth(teacher.token))
      .send({ grade: 92, feedback: 'Great' });

    for (const token of [student.token, teacher.token]) {
      const res = await request(app).get(`/api/submissions/${submission.id}/grade`).set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ graded: true, grade: 92, feedback: 'Great' });
    }
  });

  it('hides the grade from other students and other teachers behind 404', async () => {
    const submission = await createSubmission();
    for (const token of [otherStudent.token, otherTeacher.token]) {
      const res = await request(app).get(`/api/submissions/${submission.id}/grade`).set(auth(token));
      expect(res.status).toBe(404);
    }
  });
});
