import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export interface TaskPageFilter {
  status: 'all' | 'open' | 'closed';
  createdBy?: bigint;
}

export const taskRepository = {
  create(data: { title: string; description: string; deadline: Date; createdBy: bigint }) {
    return prisma.task.create({ data });
  },

  // Returns one page plus the total count, read in a single transaction so
  // the two agree. id breaks ties so pages are stable when deadlines match.
  findPage(skip: number, take: number, filter: TaskPageFilter = { status: 'all' }) {
    const now = new Date();
    const where: Prisma.TaskWhereInput = {
      ...(filter.createdBy !== undefined && { createdBy: filter.createdBy }),
      ...(filter.status === 'open' && { deadline: { gt: now } }),
      ...(filter.status === 'closed' && { deadline: { lte: now } }),
    };
    // Closed tasks read newest-first; otherwise the soonest deadline leads.
    const direction = filter.status === 'closed' ? 'desc' : 'asc';
    return prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: [{ deadline: direction }, { id: direction }],
        skip,
        take,
      }),
      prisma.task.count({ where }),
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
