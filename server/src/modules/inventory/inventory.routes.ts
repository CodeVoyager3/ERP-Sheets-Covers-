import { Router } from 'express';
import { getStock, stockIn } from './inventory.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware'
import { validate } from '../../lib/validate';
import { stockInSchema } from './inventory.schema';

const router = Router();

// View current stock levels (only authenticated user)
router.get('/stock', authenticate, getStock);
//restocking route
router.post('/stock-in', authenticate, requireRole('OWNER'), validate(stockInSchema), stockIn);

export default router;