import { Router } from 'express';
import { getLogs } from './activityLog.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// only authenticated owner can see audit logs
router.get('/', authenticate, requireRole('OWNER'), getLogs);

export default router;