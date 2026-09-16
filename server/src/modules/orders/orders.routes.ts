import { Router } from 'express';
import { create, confirm } from './orders.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// any authenticated person can create an order
router.post('/', authenticate, create);
router.patch('/:id/confirm', authenticate, confirm) // confirmed order route

export default router;