import { prisma } from '../config/db';

export const passwordResetRepository = {
  create(data: { userId: bigint; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordReset.create({ data });
  },

  findValidByTokenHash(tokenHash: string) {
    return prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  markUsed(id: bigint) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
