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

export const advanceJobStage = async (jobId: string, userId: string, note?: string) => {
  return await prisma.$transaction(async (tx) => {
    const job = await tx.productionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');
    const stages = ['QUEUED', 'CUTTING', 'STITCHING', 'QUALITY_CHECK', 'COMPLETED'];
    const currentIndex = stages.indexOf(job.stage);
    
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      throw new Error('Cannot advance job from current stage');
    }
    
    const nextStage = stages[currentIndex + 1] as any;
    
    // 1. Advance the stage
    const updatedJob = await tx.productionJob.update({
      where: { id: jobId },
      data: { stage: nextStage },
    });
    
    // 2. Write the stage log
    await tx.productionStageLog.create({
      data: { 
        productionJobId: jobId, 
        stage: nextStage, 
        userId, 
        note: note ?? null, 
      },
    });
    
    // 3. If COMPLETED, add to inventory stock
    if (nextStage === 'COMPLETED') {
      await tx.stockLedgerEntry.create({
        data: {
          productId: job.productId,
          type: 'PRODUCTION_YIELD', // <-- Correct enum value for manufactured goods
          quantity: job.quantity,
          userId,
          note: `Manufactured via Job ${job.id}`,
        }
      });
    }
    return updatedJob;
  });
};

export const getJobById = async (jobId: string) => {
  return await prisma.productionJob.findUnique({
    where: { id: jobId },
    include: {
      product: true,
      stageLogs: { include: { user: { select: { name: true } } } },
      order: { select: { customerName: true, status: true } },
    },
  });
};

export const getJobs = async (stage?: string) => {
  return await prisma.productionJob.findMany({
    ...(stage ? { where: { stage: stage as any } } : {}),
    include: {
      product: true,
      order: { select: { customerName: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};
