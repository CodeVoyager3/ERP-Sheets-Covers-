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

export const getLedgerSummary = async () => {
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ['account'],
    _sum: { debit: true, credit: true },
  });

  // Calculate net balances based on standard accounting rules
  return grouped.map(entry => {
    const debit = Number(entry._sum.debit ?? 0);
    const credit = Number(entry._sum.credit ?? 0);
    
    // Revenue normally has a credit balance, assets (Receivables/Cash/Inv) have debit balances
    const balance = entry.account === 'REVENUE' ? (credit - debit) : (debit - credit);
    
    return { account: entry.account, debit, credit, balance };
  });
};