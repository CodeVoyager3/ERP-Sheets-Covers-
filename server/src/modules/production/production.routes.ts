import { Router } from 'express';
import { create, getAll, complete, advance, getJobDetail, getJobs } from './production.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../lib/validate';
import { createWorkOrderSchema, completeWorkOrderSchema, advanceJobSchema } from './production.schema';

const router = Router();

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireRole('OWNER', 'MANAGER'), validate(createWorkOrderSchema), create);
router.patch('/:id/complete', authenticate, requireRole('OWNER', 'MANAGER'), validate(completeWorkOrderSchema), complete);
router.patch('/jobs/:id/advance', authenticate, requireRole('OWNER', 'MANAGER'), validate(advanceJobSchema), advance);
router.get('/jobs', authenticate, getJobs);
router.get('/jobs/:id', authenticate, getJobDetail);

export default router;