import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
  }),
});

export const completeWorkOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid work order ID format'),
  }),
});