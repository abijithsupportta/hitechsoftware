import { z } from 'zod';

export const brandNameSchema = z.string().trim().min(2, 'Brand name is required').max(120, 'Brand name is too long');

export const createBrandSchema = z.object({
  name: brandNameSchema,
});
