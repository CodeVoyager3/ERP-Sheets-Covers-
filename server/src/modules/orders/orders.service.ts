import { prisma } from '../../config/prisma';

// fecth all orders
export const getAllOrders = async () => {
  return await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: { product: true } // Include the actual product details for the frontend
      },
      createdBy: {
        select: { name: true, email: true }
      }
    }
  });
};

//create an order
export const createOrder = async (
  customerName: string,
  createdById: string,
  items: { productId: string; quantity: number; unitPrice: number }[]
) => {
  // prisma nested writes --> we can create orders and items simultaneously
  return await prisma.order.create({
    data: {
      customerName,
      createdById,
      status: 'PENDING', // by default new orders set as pending...
      items: {
        create: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      items: true, // returning the items....
    },
  });
};

// confirming the order 
export const confirmOrder = async (orderId: string, userId: string) => {
  // Wrapping everything in $transaction ensures it all succeeds or all fails together
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch and validate the order
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'PENDING') throw new Error('Order must be PENDING to confirm');

    // Calculate the total order value for the finance ledger
    const totalAmount = order.items.reduce((sum, item) => {
      return sum + (Number(item.unitPrice) * item.quantity);
    }, 0);

    // 2. Deduct Inventory (Append-only Ledger Pattern)
    for (const item of order.items) {
      await tx.stockLedgerEntry.create({
        data: {
          productId: item.productId,
          type: 'STOCK_OUT',
          quantity: -item.quantity, // Negative because stock is leaving
          orderId: order.id,
          userId: userId,
          note: `Auto-deducted for Order ${order.id}`,
        },
      });
    }

    // 3. Double-Entry Finance Ledger
    // Debit Accounts Receivable
    await tx.ledgerEntry.create({
      data: {
        orderId: order.id,
        account: 'ACCOUNTS_RECEIVABLE',
        debit: totalAmount,
        credit: 0,
        userId: userId,
      },
    });
    // Credit Revenue
    await tx.ledgerEntry.create({
      data: {
        orderId: order.id,
        account: 'REVENUE',
        debit: 0,
        credit: totalAmount,
        userId: userId,
      },
    });

    // 4. Advance the Order Status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    // 5. Write to the Activity Log
    await tx.activityLog.create({
      data: {
        userId: userId,
        action: 'order_confirmed',
        entityType: 'Order',
        entityId: order.id,
        details: { totalAmount, itemsCount: order.items.length },
      },
    });

    return updatedOrder;
  });
};