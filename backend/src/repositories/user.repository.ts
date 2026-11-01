import { prisma } from '../config/db';
import { Role } from '@prisma/client';

export const userRepository = {
  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: bigint) {
    return prisma.user.findUnique({ where: { id } });
  },

  createStudent(data: { username: string; email: string; hashPassword: string }) {
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        hashPassword: data.hashPassword,
        role: Role.student,
      },
    });
  },

  // Only used by scripts/seed-teacher.ts - there is no HTTP route for this.
  createTeacher(data: { username: string; email: string; hashPassword: string }) {
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        hashPassword: data.hashPassword,
        role: Role.teacher,
      },
    });
  },

  updatePassword(id: bigint, hashPassword: string) {
    return prisma.user.update({ where: { id }, data: { hashPassword } });
  },
};
