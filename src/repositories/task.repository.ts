import { prisma } from '../config/db';

export const taskRepository = {
  create(data: { title: string; description: string; deadline: Date; createdBy: bigint }) {
    return prisma.task.create({ data });
  },

  // Returns one page plus the total count, read in a single transaction so
  // the two agree. id breaks ties so pages are stable when deadlines match.
  findPage(skip: number, take: number) {
    return prisma.$transaction([
      prisma.task.findMany({ orderBy: [{ deadline: 'asc' }, { id: 'asc' }], skip, take }),
      prisma.task.count(),
    ]);
  },

  findById(id: bigint) {
    return prisma.task.findUnique({ where: { id } });
  },

  update(id: bigint, data: { title: string; description: string; deadline: Date }) {
    return prisma.task.update({ where: { id }, data });
  },

  // Submissions (and their grades) go with it via ON DELETE CASCADE.
  delete(id: bigint) {
    return prisma.task.delete({ where: { id } });
  },
};
