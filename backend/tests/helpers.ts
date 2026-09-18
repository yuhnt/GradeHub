import { Role } from '@prisma/client';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';

// Users are inserted directly (teachers can't register over HTTP anyway)
// and tokens are signed directly, so each test file stays independent of
// the auth endpoints. The password hash is never checked in these tests.
export async function createUser(username: string, role: 'student' | 'teacher') {
  const user = await prisma.user.create({
    data: {
      username,
      email: `${username}@example.com`,
      hashPassword: 'not-a-real-hash',
      role: role === 'teacher' ? Role.teacher : Role.student,
    },
  });
  return {
    id: user.id,
    token: signToken({ userId: user.id.toString(), role }),
  };
}

// Every username in a test file starts with its prefix, so cleanup can't
// touch another file's data when Jest runs them in parallel.
export async function deleteUsersWithPrefix(prefix: string) {
  await prisma.user.deleteMany({ where: { username: { startsWith: prefix } } });
}


export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const futureDate = (days = 7) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
export const pastDate = (days = 1) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const pdf = {
  buffer: Buffer.from('%PDF-1.4\n%test file\n%%EOF\n'),
  options: { filename: 'answer.pdf', contentType: 'application/pdf' },
};
