import { z } from 'zod';

const materialCodeSchema = z
  .string()
  .min(2, 'Material code must be at least 2 characters')
  .max(100)
  .regex(/^[A-Za-z0-9\-_/]+$/, 'Material code may only contain letters, numbers, hyphens, underscores, and slashes')
  .trim();

export const stockEntryItemSchema = z.object({
  product_id: z.string().uuid().nullable(),
  material_code: materialCodeSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  hsn_sac_code: z.string().max(20).trim().nullish(),
});

export const createStockEntrySchema = z.object({
  invoice_number: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number must be 100 characters or fewer')
    .trim(),
  entry_date: z.string().min(1, 'Date is required'),
  notes: z.string().max(1000).trim().nullish(),
  items: z
    .array(stockEntryItemSchema)
    .min(1, 'At least one item is required'),
});

export type CreateStockEntryFormValues = z.infer<typeof createStockEntrySchema>;
export type StockEntryItemFormValues = z.infer<typeof stockEntryItemSchema>;
