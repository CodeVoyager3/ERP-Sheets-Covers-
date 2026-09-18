import { Router } from 'express';
import { getUsers, updateUser, getUserActivity, createUser } from './users.controller';
import { validate } from '../../lib/validate';
import { createUserSchema } from './users.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// only authenticated owner can view and manage users
router.post('/', authenticate, requireRole('OWNER'), validate(createUserSchema), createUser);
router.get('/', authenticate, requireRole('OWNER'), getUsers);
router.patch('/:id', authenticate, requireRole('OWNER'), updateUser);
router.get('/:id/activity', authenticate, requireRole('OWNER'), getUserActivity);

export default router;