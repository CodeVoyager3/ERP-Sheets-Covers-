import { Router } from 'express';
import { create, confirm, getAll, dispatch, deliver, cancel, getOne } from './orders.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../lib/validate';
import { createOrderSchema, confirmOrderSchema } from './orders.schema';

const router = Router();

// any authenticated person can create an order
router.get('/', authenticate, getAll);
router.post('/', authenticate, validate(createOrderSchema), create);
router.patch('/:id/confirm', authenticate, validate(confirmOrderSchema), confirm); // confirmed order route
router.patch('/:id/dispatch', authenticate, validate(confirmOrderSchema), dispatch);
router.patch('/:id/deliver', authenticate, validate(confirmOrderSchema), deliver);
router.patch('/:id/cancel', authenticate, validate(confirmOrderSchema), cancel);
router.get('/:id', authenticate, validate(confirmOrderSchema), getOne);

export default router;