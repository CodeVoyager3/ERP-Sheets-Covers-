import { Router } from 'express';
import { getUsers, updateUser } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// only authenticated owner can view and manage users
router.get('/', authenticate, requireRole('OWNER'), getUsers);
router.patch('/:id', authenticate, requireRole('OWNER'), updateUser);

export default router;