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
          quantity: -item.quantity,
          orderId: order.id,
          userId: userId,
          note: `Auto-deducted for Order ${order.id}`,
        },
      });

      // Check if product requires manufacturing (has BOM)
      const productWithBom = await tx.product.findUnique({
        where: { id: item.productId },
        include: { bomLines: true }
      });

      if (productWithBom && productWithBom.bomLines.length > 0) {
        await tx.productionJob.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            stage: 'QUEUED',
          }
        });
      }
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

export const dispatchOrder = async (orderId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    
    // Enforce PRD rules: Must be CONFIRMED or IN_PRODUCTION to dispatch
    if (order.status !== 'CONFIRMED' && order.status !== 'IN_PRODUCTION') {
      throw new Error('Order must be CONFIRMED or IN_PRODUCTION to dispatch');
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'DISPATCHED' },
    });

    await tx.activityLog.create({
      data: { userId, action: 'order_dispatched', entityType: 'Order', entityId: order.id },
    });

    return updated;
  });
};

export const deliverOrder = async (orderId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    
    if (order.status !== 'DISPATCHED') {
      throw new Error('Order must be DISPATCHED before it can be delivered');
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });

    await tx.activityLog.create({
      data: { userId, action: 'order_delivered', entityType: 'Order', entityId: order.id },
    });

    return updated;
  });
};

export const cancelOrder = async (orderId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    
    if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
      throw new Error('Cannot cancel an order that has already been dispatched or delivered');
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    await tx.activityLog.create({
      data: { userId, action: 'order_cancelled', entityType: 'Order', entityId: order.id },
    });

    return updated;
  });
};

export const getOrderById = async (orderId: string) => {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      stockMovements: true,
      ledgerEntries: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
};