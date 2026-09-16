import { Router } from 'express';
import { create, confirm, getAll } from './orders.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../lib/validate';
import { createOrderSchema, confirmOrderSchema } from './orders.schema'; 

const router = Router();

// any authenticated person can create an order
router.get('/', authenticate, getAll);
router.post('/', authenticate, validate(createOrderSchema), create);
router.patch('/:id/confirm', authenticate, validate(confirmOrderSchema), confirm); // confirmed order route

export default router;