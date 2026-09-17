import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(3, "SKU must be at least 3 characters long"),
    name: z.string().min(1, "Product name is required"),
    price: z.number().positive("Price must be greater than zero"),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
});

export const addBomSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    componentId: z.string().uuid('Invalid component product ID format'),
    quantity: z.number().int().positive('Quantity required must be a positive integer'),
  }),
});