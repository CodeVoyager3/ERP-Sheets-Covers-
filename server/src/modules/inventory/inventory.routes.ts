import { Router } from 'express';
import { getStock, stockIn } from './inventory.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware'

const router = Router();

// View current stock levels (only authenticated user)
router.get('/stock', authenticate, getStock);
//restocking route
router.post('/stock-in', authenticate, requireRole('OWNER'), stockIn)

export default router;