import { Router } from 'express';
import { create, getAll, complete } from './production.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../lib/validate';
import { createWorkOrderSchema, completeWorkOrderSchema } from './production.schema';

const router = Router();

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireRole('OWNER', 'MANAGER'), validate(createWorkOrderSchema), create);
router.patch('/:id/complete', authenticate, requireRole('OWNER', 'MANAGER'), validate(completeWorkOrderSchema), complete);

export default router;