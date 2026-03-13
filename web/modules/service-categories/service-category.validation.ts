import { z } from 'zod';

export const serviceCategoryNameSchema = z
  .string()
  .trim()
  .min(2, 'Category name is required')
  .max(120, 'Category name is too long');

export const createServiceCategorySchema = z.object({
  name: serviceCategoryNameSchema,
});
