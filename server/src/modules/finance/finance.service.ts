import { prisma } from '../../config/prisma';

export const getLedgerEntries = async () => {
  return await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: { customerName: true, status: true },
      },
    },
  });
};