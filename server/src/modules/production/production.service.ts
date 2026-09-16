import { prisma } from '../../config/prisma';

export const createWorkOrder = async (
  productId: string,
  quantity: number,
  userId: string
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the work order
    const workOrder = await tx.workOrder.create({
      data: {
        productId,
        quantity,
        status: 'PLANNED',
        createdById: userId,
      },
    });

    // 2. Log activity
    await tx.activityLog.create({
      data: {
        userId,
        action: 'work_order_created',
        entityType: 'WorkOrder',
        entityId: workOrder.id,
        details: { productId, quantity },
      },
    });

    return workOrder;
  });
};

export const getWorkOrders = async () => {
  return await prisma.workOrder.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const completeWorkOrder = async (workOrderId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!workOrder) throw new Error('Work order not found');
    if (workOrder.status === 'COMPLETED') throw new Error('Work order is already completed');

    // 1. Update work order status
    const updated = await tx.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'COMPLETED' },
    });

    // 2. Automatically add the manufactured items to inventory stock!
    await tx.stockLedgerEntry.create({
      data: {
        productId: workOrder.productId,
        type: 'STOCK_IN',
        quantity: workOrder.quantity,
        userId,
        note: `Production completed for Work Order ${workOrder.id}`,
      },
    });

    return updated;
  });
};