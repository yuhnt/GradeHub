import { prisma } from '../config/db';

export const submissionRepository = {
  create(data: { userId: bigint; taskId: bigint; filePath: string; isTest: boolean }) {
    return prisma.submission.create({ data });
  },

  findById(id: bigint) {
    return prisma.submission.findUnique({ where: { id } });
  },

  findByIdWithTask(id: bigint) {
    return prisma.submission.findUnique({ where: { id }, include: { task: true } });
  },

  // The (userId, taskId) unique index is partial (isTest = false only),
  // so this can't be a findUnique.
  findActiveByUserAndTask(userId: bigint, taskId: bigint) {
    return prisma.submission.findFirst({ where: { userId, taskId, isTest: false } });
  },

  findRealByTask(taskId: bigint) {
    return prisma.submission.findMany({
      where: { taskId, isTest: false },
      orderBy: { createdAt: 'asc' },
    });
  },

  findFilePathsByTask(taskId: bigint) {
    return prisma.submission.findMany({ where: { taskId }, select: { filePath: true } });
  },

  delete(id: bigint) {
    return prisma.submission.delete({ where: { id } });
  },

  updateGrade(id: bigint, data: { grade: number; feedback: string | null }) {
    return prisma.submission.update({
      where: { id },
      data: { grade: data.grade, feedback: data.feedback, gradeAt: new Date() },
    });
  },
};
