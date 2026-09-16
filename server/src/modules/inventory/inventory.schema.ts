import { z } from 'zod';

export const stockInSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    note: z.string().optional(),
  }),
});