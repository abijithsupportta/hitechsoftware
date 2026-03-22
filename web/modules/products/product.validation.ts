import { z } from 'zod';

// Material code: alphanumeric, may contain hyphens/slashes, min 2 chars
const materialCodeSchema = z
  .string()
  .min(2, 'Material code must be at least 2 characters')
  .max(100, 'Material code must be 100 characters or fewer')
  .regex(/^[A-Za-z0-9\-_/]+$/, 'Material code may only contain letters, numbers, hyphens, underscores, and slashes')
  .trim();

export const createProductSchema = z
  .object({
    product_name: z.string().min(1, 'Product name is required').max(255).trim(),
    description: z.string().max(2000).trim().nullish(),
    material_code: materialCodeSchema,
    category_id: z.string().uuid('Invalid category').nullish(),
    product_type_id: z.string().uuid('Invalid product type').nullish(),
    is_refurbished: z.boolean(),
    refurbished_label: z.string().max(100).trim().nullish(),
    hsn_sac_code: z.string().max(20).trim().nullish(),
    is_active: z.boolean(),
  })
  .refine(
    (data) => !data.is_refurbished || (data.refurbished_label && data.refurbished_label.trim().length > 0),
    { message: 'Refurbished label is required when product is marked as refurbished', path: ['refurbished_label'] },
  );

export const updateProductSchema = createProductSchema.partial();

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
