import { Router } from 'express';
import { create, getAll,  getOne, update, addBom } from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../lib/validate';
import { createProductSchema, productIdSchema, addBomSchema } from './products.schema';

const router = Router();

// Owner-only creation
router.post('/', authenticate, requireRole('OWNER'), validate(createProductSchema), create);

// View all products (Authenticated)
router.get('/', authenticate, getAll);

// View single product detail + BOM (Authenticated)
router.get('/:id', authenticate, validate(productIdSchema), getOne);

// Update product (Owner only)
router.patch('/:id', authenticate, requireRole('OWNER'), validate(productIdSchema), update);

// Add BOM line component (Owner only)
router.post('/:id/bom', authenticate, requireRole('OWNER'), validate(addBomSchema), addBom);

export default router;