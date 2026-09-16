import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(3, "SKU must be at least 3 characters long"),
    name: z.string().min(1, "Product name is required"),
    price: z.number().positive("Price must be greater than zero"),
  }),
});