import { Router } from 'express';
import { getLedger } from './finance.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// only authenticated owner can view financial ledger entries
router.get('/ledger', authenticate, requireRole('OWNER'), getLedger);

export default router;