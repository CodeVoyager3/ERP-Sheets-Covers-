import { prisma } from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('--- Cleaning existing database tables ---');
  await prisma.activityLog.deleteMany();
  await prisma.productionStageLog.deleteMany();
  await prisma.productionJob.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.stockLedgerEntry.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Creating Users ---');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const owner = await prisma.user.create({
    data: {
      name: 'Rajesh Sharma',
      email: 'owner@sheetcover.com',
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'vikram@sheetcover.com',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@sheetcover.com',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    },
  });

  const staff3 = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul@sheetcover.com',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    },
  });

  const staff4 = await prisma.user.create({
    data: {
      name: 'Ananya Roy',
      email: 'ananya@sheetcover.com',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('--- Creating Products (Components & Finished Goods) ---');
  // Raw materials
  const vinylGrey = await prisma.product.create({
    data: {
      sku: 'RM-VINYL-GRY',
      name: 'Automotive Vinyl - Slate Grey (Meters)',
      price: 450.0,
    },
  });

  const vinylBlack = await prisma.product.create({
    data: {
      sku: 'RM-VINYL-BLK',
      name: 'Nappa Grain Vinyl - Carbon Black (Meters)',
      price: 520.0,
    },
  });

  const foam10mm = await prisma.product.create({
    data: {
      sku: 'RM-FOAM-10MM',
      name: 'Quilted High-Density Foam 10mm (Meters)',
      price: 180.0,
    },
  });

  const elasticBand = await prisma.product.create({
    data: {
      sku: 'RM-ELAST-HD',
      name: 'Heavy Duty Fastener Elastic Band 2" (Meters)',
      price: 65.0,
    },
  });

  const nylonThread = await prisma.product.create({
    data: {
      sku: 'RM-NYL-THRD',
      name: 'Bonded Industrial Nylon Thread (Spool)',
      price: 120.0,
    },
  });

  const pipingCord = await prisma.product.create({
    data: {
      sku: 'RM-PIPING-CORD',
      name: 'Reinforced Edge Piping Cord (Meters)',
      price: 45.0,
    },
  });

  // Finished Goods
  const sedanCover = await prisma.product.create({
    data: {
      sku: 'SC-SEDAN-GRY',
      name: 'Luxury Sedan Seat Cover - Slate Grey',
      price: 2899.0,
    },
  });

  const suvCover = await prisma.product.create({
    data: {
      sku: 'SC-SUV-BLK',
      name: 'Elite SUV Full Cabin Set - Carbon Black',
      price: 4499.0,
    },
  });

  const hatchCover = await prisma.product.create({
    data: {
      sku: 'SC-HATCH-BLU',
      name: 'Universal Hatchback Cover - Navy Blue',
      price: 1999.0,
    },
  });

  const truckCover = await prisma.product.create({
    data: {
      sku: 'SC-TRUCK-WPRF',
      name: 'Heavy Duty Waterproof Truck Seat Cover',
      price: 3499.0,
    },
  });

  console.log('--- Creating Bill of Materials (BOM) ---');
  // Sedan Cover BOM
  await prisma.bomLine.createMany({
    data: [
      { parentProductId: sedanCover.id, componentProductId: vinylGrey.id, quantityRequired: 3 },
      { parentProductId: sedanCover.id, componentProductId: foam10mm.id, quantityRequired: 2 },
      { parentProductId: sedanCover.id, componentProductId: elasticBand.id, quantityRequired: 4 },
      { parentProductId: sedanCover.id, componentProductId: nylonThread.id, quantityRequired: 1 },
    ],
  });

  // SUV Cover BOM
  await prisma.bomLine.createMany({
    data: [
      { parentProductId: suvCover.id, componentProductId: vinylBlack.id, quantityRequired: 5 },
      { parentProductId: suvCover.id, componentProductId: foam10mm.id, quantityRequired: 3 },
      { parentProductId: suvCover.id, componentProductId: elasticBand.id, quantityRequired: 6 },
      { parentProductId: suvCover.id, componentProductId: pipingCord.id, quantityRequired: 2 },
      { parentProductId: suvCover.id, componentProductId: nylonThread.id, quantityRequired: 1 },
    ],
  });

  // Hatchback Cover BOM
  await prisma.bomLine.createMany({
    data: [
      { parentProductId: hatchCover.id, componentProductId: vinylGrey.id, quantityRequired: 2 },
      { parentProductId: hatchCover.id, componentProductId: foam10mm.id, quantityRequired: 1 },
      { parentProductId: hatchCover.id, componentProductId: elasticBand.id, quantityRequired: 4 },
    ],
  });

  // Truck Cover BOM
  await prisma.bomLine.createMany({
    data: [
      { parentProductId: truckCover.id, componentProductId: vinylBlack.id, quantityRequired: 4 },
      { parentProductId: truckCover.id, componentProductId: foam10mm.id, quantityRequired: 2 },
      { parentProductId: truckCover.id, componentProductId: elasticBand.id, quantityRequired: 6 },
    ],
  });

  console.log('--- Adding Initial Inventory (Stock In) ---');
  const initialSupplies = [
    { product: vinylGrey, qty: 350, note: 'PO #1001: Initial bulk vinyl roll consignment' },
    { product: vinylBlack, qty: 400, note: 'PO #1002: Black nappa vinyl roll consignment' },
    { product: foam10mm, qty: 500, note: 'PO #1003: Quilted foam shipment received' },
    { product: elasticBand, qty: 600, note: 'PO #1004: Industrial elastic fasteners' },
    { product: nylonThread, qty: 150, note: 'PO #1005: Thread spools delivered' },
    { product: pipingCord, qty: 250, note: 'PO #1006: Piping cord delivered' },
    { product: sedanCover, qty: 45, note: 'Opening warehouse inventory count' },
    { product: suvCover, qty: 30, note: 'Opening warehouse inventory count' },
    { product: hatchCover, qty: 20, note: 'Opening warehouse inventory count' },
    { product: truckCover, qty: 12, note: 'Opening warehouse inventory count' },
  ];

  for (const item of initialSupplies) {
    await prisma.stockLedgerEntry.create({
      data: {
        productId: item.product.id,
        type: 'STOCK_IN',
        quantity: item.qty,
        userId: owner.id,
        note: item.note,
      },
    });
  }

  console.log('--- Creating Orders across Lifecycle Stages ---');
  // Order 1: DELIVERED
  const order1 = await prisma.order.create({
    data: {
      customerName: 'Apex Fleet Solutions Pvt Ltd',
      status: 'DELIVERED',
      createdById: staff1.id,
      items: {
        create: [
          { productId: sedanCover.id, quantity: 4, unitPrice: 2899.0 },
          { productId: suvCover.id, quantity: 2, unitPrice: 4499.0 },
        ],
      },
    },
  });
  const totalOrder1 = 4 * 2899 + 2 * 4499; // 20594
  // Deduct stock for Order 1
  await prisma.stockLedgerEntry.createMany({
    data: [
      { productId: sedanCover.id, type: 'STOCK_OUT', quantity: -4, orderId: order1.id, userId: staff1.id, note: `Auto-deducted for Order ${order1.id}` },
      { productId: suvCover.id, type: 'STOCK_OUT', quantity: -2, orderId: order1.id, userId: staff1.id, note: `Auto-deducted for Order ${order1.id}` },
    ],
  });
  // Financial entries for Order 1
  await prisma.ledgerEntry.createMany({
    data: [
      { orderId: order1.id, account: 'ACCOUNTS_RECEIVABLE', debit: totalOrder1, credit: 0, userId: staff1.id },
      { orderId: order1.id, account: 'REVENUE', debit: 0, credit: totalOrder1, userId: staff1.id },
      // Mark payment collected for delivered order
      { orderId: order1.id, account: 'CASH', debit: totalOrder1, credit: 0, userId: owner.id },
      { orderId: order1.id, account: 'ACCOUNTS_RECEIVABLE', debit: 0, credit: totalOrder1, userId: owner.id },
    ],
  });

  // Order 2: DISPATCHED
  const order2 = await prisma.order.create({
    data: {
      customerName: 'Mahindra Auto Dealership Showroom',
      status: 'DISPATCHED',
      createdById: staff2.id,
      items: {
        create: [
          { productId: suvCover.id, quantity: 3, unitPrice: 4499.0 },
        ],
      },
    },
  });
  const totalOrder2 = 3 * 4499; // 13497
  await prisma.stockLedgerEntry.create({
    data: { productId: suvCover.id, type: 'STOCK_OUT', quantity: -3, orderId: order2.id, userId: staff2.id, note: `Auto-deducted for Order ${order2.id}` },
  });
  await prisma.ledgerEntry.createMany({
    data: [
      { orderId: order2.id, account: 'ACCOUNTS_RECEIVABLE', debit: totalOrder2, credit: 0, userId: staff2.id },
      { orderId: order2.id, account: 'REVENUE', debit: 0, credit: totalOrder2, userId: staff2.id },
    ],
  });

  // Order 3: IN_PRODUCTION
  const order3 = await prisma.order.create({
    data: {
      customerName: 'Sharma Taxi & Tour Operators',
      status: 'IN_PRODUCTION',
      createdById: staff3.id,
      items: {
        create: [
          { productId: sedanCover.id, quantity: 5, unitPrice: 2899.0 },
        ],
      },
    },
  });
  const totalOrder3 = 5 * 2899; // 14495
  await prisma.stockLedgerEntry.create({
    data: { productId: sedanCover.id, type: 'STOCK_OUT', quantity: -5, orderId: order3.id, userId: staff3.id, note: `Auto-deducted for Order ${order3.id}` },
  });
  await prisma.ledgerEntry.createMany({
    data: [
      { orderId: order3.id, account: 'ACCOUNTS_RECEIVABLE', debit: totalOrder3, credit: 0, userId: staff3.id },
      { orderId: order3.id, account: 'REVENUE', debit: 0, credit: totalOrder3, userId: staff3.id },
    ],
  });

  // Order 4: CONFIRMED
  const order4 = await prisma.order.create({
    data: {
      customerName: 'Metro Cab Services NCR',
      status: 'CONFIRMED',
      createdById: staff1.id,
      items: {
        create: [
          { productId: hatchCover.id, quantity: 3, unitPrice: 1999.0 },
          { productId: truckCover.id, quantity: 1, unitPrice: 3499.0 },
        ],
      },
    },
  });
  const totalOrder4 = 3 * 1999 + 1 * 3499; // 9496
  await prisma.stockLedgerEntry.createMany({
    data: [
      { productId: hatchCover.id, type: 'STOCK_OUT', quantity: -3, orderId: order4.id, userId: staff1.id, note: `Auto-deducted for Order ${order4.id}` },
      { productId: truckCover.id, type: 'STOCK_OUT', quantity: -1, orderId: order4.id, userId: staff1.id, note: `Auto-deducted for Order ${order4.id}` },
    ],
  });
  await prisma.ledgerEntry.createMany({
    data: [
      { orderId: order4.id, account: 'ACCOUNTS_RECEIVABLE', debit: totalOrder4, credit: 0, userId: staff1.id },
      { orderId: order4.id, account: 'REVENUE', debit: 0, credit: totalOrder4, userId: staff1.id },
    ],
  });

  // Order 5: PENDING (ready for the user to confirm!)
  const order5 = await prisma.order.create({
    data: {
      customerName: 'Royal Motors Auto Care Gurugram',
      status: 'PENDING',
      createdById: staff2.id,
      items: {
        create: [
          { productId: suvCover.id, quantity: 2, unitPrice: 4499.0 },
          { productId: sedanCover.id, quantity: 2, unitPrice: 2899.0 },
        ],
      },
    },
  });

  // Order 6: CANCELLED
  await prisma.order.create({
    data: {
      customerName: 'City Car Rentals (Order Withdrawn)',
      status: 'CANCELLED',
      createdById: staff4.id,
      items: {
        create: [
          { productId: hatchCover.id, quantity: 2, unitPrice: 1999.0 },
        ],
      },
    },
  });

  console.log('--- Creating Production Jobs & Stage Passports ---');
  // Job 1: Tied to Order 3 (sedanCover, 5 units) - currently in STITCHING
  const job1 = await prisma.productionJob.create({
    data: {
      orderId: order3.id,
      productId: sedanCover.id,
      quantity: 5,
      stage: 'STITCHING',
    },
  });
  await prisma.productionStageLog.createMany({
    data: [
      { productionJobId: job1.id, stage: 'QUEUED', userId: staff1.id, note: 'BOM exploded and raw vinyl rolls pulled from staging' },
      { productionJobId: job1.id, stage: 'CUTTING', userId: staff2.id, note: 'Pattern cutting completed with computerized cutter' },
      { productionJobId: job1.id, stage: 'STITCHING', userId: staff3.id, note: 'Heavy duty nylon double seam stitching in progress' },
    ],
  });

  // Job 2: Tied to Order 4 (truckCover, 1 unit) - currently in CUTTING
  const job2 = await prisma.productionJob.create({
    data: {
      orderId: order4.id,
      productId: truckCover.id,
      quantity: 1,
      stage: 'CUTTING',
    },
  });
  await prisma.productionStageLog.createMany({
    data: [
      { productionJobId: job2.id, stage: 'QUEUED', userId: staff1.id, note: 'Materials requisition approved' },
      { productionJobId: job2.id, stage: 'CUTTING', userId: staff2.id, note: 'Waterproof fabric cutting initiated' },
    ],
  });

  // Job 3: Completed job for SUV Cover
  const job3 = await prisma.productionJob.create({
    data: {
      orderId: order2.id,
      productId: suvCover.id,
      quantity: 3,
      stage: 'COMPLETED',
    },
  });
  await prisma.productionStageLog.createMany({
    data: [
      { productionJobId: job3.id, stage: 'QUEUED', userId: staff1.id, note: 'Order confirmed - manufacturing scheduled' },
      { productionJobId: job3.id, stage: 'CUTTING', userId: staff2.id, note: 'Panel cutting approved' },
      { productionJobId: job3.id, stage: 'STITCHING', userId: staff3.id, note: 'Seams bound and piping cords aligned' },
      { productionJobId: job3.id, stage: 'QUALITY_CHECK', userId: owner.id, note: '100% defect free inspection passed' },
      { productionJobId: job3.id, stage: 'COMPLETED', userId: owner.id, note: 'Yield added to warehouse finished inventory' },
    ],
  });
  await prisma.stockLedgerEntry.create({
    data: {
      productId: suvCover.id,
      type: 'PRODUCTION_YIELD',
      quantity: 3,
      userId: owner.id,
      note: `Manufactured via Job ${job3.id}`,
    },
  });

  console.log('--- Creating Work Orders ---');
  await prisma.workOrder.create({
    data: {
      productId: sedanCover.id,
      quantity: 20,
      status: 'PLANNED',
      createdById: owner.id,
    },
  });

  const woCompleted = await prisma.workOrder.create({
    data: {
      productId: suvCover.id,
      quantity: 10,
      status: 'COMPLETED',
      createdById: owner.id,
    },
  });
  await prisma.stockLedgerEntry.create({
    data: {
      productId: suvCover.id,
      type: 'STOCK_IN',
      quantity: 10,
      userId: owner.id,
      note: `Production completed for Work Order ${woCompleted.id}`,
    },
  });

  console.log('--- Adding Inventory Value & COGS ledger entries ---');
  // Record opening inventory valuation and COGS
  await prisma.ledgerEntry.createMany({
    data: [
      { account: 'INVENTORY_VALUE', debit: 250000.0, credit: 0, userId: owner.id },
      { account: 'CASH', debit: 0, credit: 250000.0, userId: owner.id },
      { account: 'COGS', debit: 28500.0, credit: 0, userId: owner.id },
      { account: 'INVENTORY_VALUE', debit: 0, credit: 28500.0, userId: owner.id },
    ],
  });

  console.log('--- Writing Audit Activity Log ---');
  await prisma.activityLog.createMany({
    data: [
      { userId: owner.id, action: 'system_initialized', entityType: 'System', entityId: owner.id, details: { description: 'Platform configured with master catalog and seed inventory' } },
      { userId: staff1.id, action: 'order_created', entityType: 'Order', entityId: order1.id, details: { customerName: order1.customerName, total: totalOrder1 } },
      { userId: staff1.id, action: 'order_confirmed', entityType: 'Order', entityId: order1.id, details: { totalAmount: totalOrder1, itemsCount: 2 } },
      { userId: staff1.id, action: 'order_dispatched', entityType: 'Order', entityId: order1.id },
      { userId: staff1.id, action: 'order_delivered', entityType: 'Order', entityId: order1.id },
      { userId: staff2.id, action: 'order_created', entityType: 'Order', entityId: order2.id, details: { customerName: order2.customerName, total: totalOrder2 } },
      { userId: staff2.id, action: 'order_confirmed', entityType: 'Order', entityId: order2.id, details: { totalAmount: totalOrder2, itemsCount: 1 } },
      { userId: staff2.id, action: 'order_dispatched', entityType: 'Order', entityId: order2.id },
      { userId: staff3.id, action: 'order_created', entityType: 'Order', entityId: order3.id, details: { customerName: order3.customerName, total: totalOrder3 } },
      { userId: staff3.id, action: 'order_confirmed', entityType: 'Order', entityId: order3.id, details: { totalAmount: totalOrder3, itemsCount: 1 } },
      { userId: owner.id, action: 'stage_advanced', entityType: 'ProductionJob', entityId: job1.id, details: { stage: 'STITCHING' } },
      { userId: owner.id, action: 'stage_completed', entityType: 'ProductionJob', entityId: job3.id, details: { stage: 'COMPLETED', yieldQuantity: 3 } },
      { userId: owner.id, action: 'stock_adjusted', entityType: 'StockLedgerEntry', entityId: owner.id, details: { note: 'Warehouse opening count reconciliation' } },
    ],
  });

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
