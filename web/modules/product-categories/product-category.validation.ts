import { z } from 'zod';

export const createProductCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(150, 'Name must be 150 characters or fewer').trim(),
});

export const updateProductCategorySchema = z.object({
  name: z.string().min(1).max(150).trim().optional(),
  is_active: z.boolean().optional(),
});
