import { prisma } from '../../config/prisma';

export const getActivityLogs = async () => {
  return await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true, role: true },
      },
    },
  });
};