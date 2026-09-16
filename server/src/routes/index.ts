import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import productRoutes from '../modules/products/products.routes';
import orderRoutes from '../modules/orders/orders.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes'
import financeRoutes from '../modules/finance/finance.routes';
import activityLogRoutes from '../modules/activityLog/activityLog.routes';
import userRoutes from '../modules/users/users.routes';
import productionRoutes from '../modules/production/production.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/finance', financeRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/users', userRoutes);
router.use('/production', productionRoutes);

export default router;