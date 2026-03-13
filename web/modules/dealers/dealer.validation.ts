import { z } from 'zod';

export const dealerNameSchema = z
  .string()
  .trim()
  .min(2, 'Dealer name is required')
  .max(120, 'Dealer name is too long');

export const createDealerSchema = z.object({
  name: dealerNameSchema,
});
