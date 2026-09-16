import { Router } from 'express';
import { create, getAll } from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../lib/validate';
import { createProductSchema } from './products.schema';

const router = Router();

// only an owner can create products
router.post('/', authenticate, requireRole('OWNER'), validate(createProductSchema), create);

// any authenticated staff or owner can view existing products
router.get('/', authenticate, getAll);

export default router;