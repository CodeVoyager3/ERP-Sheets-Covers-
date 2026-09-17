import { prisma } from '../../config/prisma';

export const getInventoryStockLevels = async () => {
  // Aggregate stock quantities grouped by productId from the ledger
  const stockSummary = await prisma.stockLedgerEntry.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
    },
  });

  // Fetch product details so we can display SKUs and names with stock levels
  const products = await prisma.product.findMany();

  // Combine product info with their corresponding stock sums
  return products.map(product => {
    const stockEntry = stockSummary.find(s => s.productId === product.id);
    const totalStock = stockEntry?._sum.quantity ?? 0;

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      currentStock: totalStock,
    };
  });
};

// function for restocking
export const addStockIn = async (
  productId: string,
  quantity: number,
  userId: string,
  note?: string
) => {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  // check if product exists 
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  return await prisma.stockLedgerEntry.create({
    data: {
      productId,
      type: 'STOCK_IN',
      quantity: quantity, // Positive number to increase stock
      userId,
      note: note || 'Manual restock / stock-in',
    },
  });
};

export const getProductMovements = async (productId: string) => {
  return await prisma.stockLedgerEntry.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  });
};

export const manualStockAdjustment = async (productId: string, quantity: number, userId: string, note?: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  return await prisma.$transaction(async (tx) => {
    const entry = await tx.stockLedgerEntry.create({
      data: {
        productId,
        type: 'ADJUSTMENT',
        quantity, // Can be positive or negative
        userId,
        note: note || 'Manual stock adjustment by owner',
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        action: 'stock_adjusted',
        entityType: 'StockLedgerEntry',
        entityId: entry.id,
        details: { productId, quantity, note },
      },
    });

    return entry;
  });
};