import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    items: z.array(
      z.object({
        productId: z.string().uuid('Invalid product ID format'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        unitPrice: z.number().positive('Unit price must be a positive number'),
      })
    ).min(1, 'Order must contain at least one item'),
  }),
});

export const confirmOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format'),
  }),
});