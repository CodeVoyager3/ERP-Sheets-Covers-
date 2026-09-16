import { Router } from 'express';
import { create, getAll, complete } from './production.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireRole('OWNER', 'MANAGER'), create);
router.patch('/:id/complete', authenticate, requireRole('OWNER', 'MANAGER'), complete);

export default router;