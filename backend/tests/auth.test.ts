import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { emailService } from '../src/services/email.service';
import { signToken } from '../src/utils/jwt';

const app = createApp();

const testUser = {
  username: 'test_student_auth',
  email: 'test_student_auth@example.com',
  password: 'SecurePass123',
};

// These tests hit a real Postgres database (via Prisma) - set DATABASE_URL
// to a test database before running `npm test`, not your dev/prod one.
beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: testUser.username } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: testUser.username } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a student account', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('student');
    expect(res.body.username).toBe(testUser.username);
    expect(res.body.hashPassword).toBeUndefined();
  });

  it('rejects a duplicate username with 409', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, username: 'someone_else', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.username, password: testUser.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.username, password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent username with the same generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'no_such_user', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid username or password');
  });
});

describe('POST /api/auth/forgot-password', () => {
  const GENERIC = 'If that email exists, a reset link has been sent';

  afterEach(() => jest.restoreAllMocks());

  it('emails a reset token that then resets the password', async () => {
    const send = jest.spyOn(emailService, 'sendPasswordReset').mockResolvedValue();

    const res = await request(app).post('/api/auth/forgot-password').send({ email: testUser.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC);
    expect(send).toHaveBeenCalledTimes(1);
    const [to, rawToken] = send.mock.calls[0]!;
    expect(to).toBe(testUser.email);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'BrandNewPass456' });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.username, password: 'BrandNewPass456' });
    expect(login.status).toBe(200);

    // The token is single-use.
    const again = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'AnotherPass789' });
    expect(again.status).toBe(400);
  });

  it('sends nothing for an unknown email but answers identically', async () => {
    const send = jest.spyOn(emailService, 'sendPasswordReset').mockResolvedValue();
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC);
    expect(send).not.toHaveBeenCalled();
  });

  it('still answers identically when the email provider fails', async () => {
    jest.spyOn(emailService, 'sendPasswordReset').mockRejectedValue(new Error('SMTP server down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).post('/api/auth/forgot-password').send({ email: testUser.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user without the password hash', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: testUser.username } });
    const token = signToken({ userId: user.id.toString(), role: 'student' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(Number),
      username: testUser.username,
      email: testUser.email,
      role: 'student',
    });
  });

  it('rejects a request without a token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a valid token for an account that no longer exists with 401', async () => {
    const token = signToken({ userId: '999999999', role: 'student' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid or expired token');
  });
});
