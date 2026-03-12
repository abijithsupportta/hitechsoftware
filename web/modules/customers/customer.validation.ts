import { z } from 'zod';

const INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Postal code must be 6 digits');

const customerBaseSchema = z.object({
  customer_name: z.string().trim().min(2, 'Customer name is required'),
  phone_number: z
    .string()
    .trim()
    .regex(INDIAN_PHONE_REGEX, 'Enter a valid Indian phone number'),
  email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
  primary_address_line1: z.string().trim().min(3, 'Primary address line 1 is required'),
  primary_address_line2: z.string().trim().optional().or(z.literal('')),
  primary_area: z.string().trim().min(2, 'Primary area is required'),
  primary_city: z.string().trim().min(2, 'Primary city is required'),
  primary_postal_code: postalCodeSchema,
  secondary_address_label: z.string().trim().optional().or(z.literal('')),
  secondary_address_line1: z.string().trim().optional().or(z.literal('')),
  secondary_address_line2: z.string().trim().optional().or(z.literal('')),
  secondary_area: z.string().trim().optional().or(z.literal('')),
  secondary_city: z.string().trim().optional().or(z.literal('')),
  secondary_postal_code: z.string().trim().optional().or(z.literal('')),
});

export const createCustomerSchema = customerBaseSchema.superRefine((value, ctx) => {
  const secondaryValues = [
    value.secondary_address_label,
    value.secondary_address_line1,
    value.secondary_area,
    value.secondary_city,
    value.secondary_postal_code,
  ].map((item) => (item ?? '').trim());

  const hasAnySecondary = secondaryValues.some(Boolean);
  if (!hasAnySecondary) {
    return;
  }

  if (!value.secondary_address_label?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_address_label'],
      message: 'Secondary address label is required',
    });
  }

  if (!value.secondary_address_line1?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_address_line1'],
      message: 'Secondary address line 1 is required',
    });
  }

  if (!value.secondary_area?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_area'],
      message: 'Secondary area is required',
    });
  }

  if (!value.secondary_city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_city'],
      message: 'Secondary city is required',
    });
  }

  if (!value.secondary_postal_code?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_postal_code'],
      message: 'Secondary postal code is required',
    });
  } else if (!/^\d{6}$/.test(value.secondary_postal_code.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_postal_code'],
      message: 'Secondary postal code must be 6 digits',
    });
  }
});

export const updateCustomerSchema = customerBaseSchema.partial().superRefine((value, ctx) => {
  if (value.phone_number && !INDIAN_PHONE_REGEX.test(value.phone_number.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone_number'],
      message: 'Enter a valid Indian phone number',
    });
  }

  const secondaryFields = [
    value.secondary_address_label,
    value.secondary_address_line1,
    value.secondary_area,
    value.secondary_city,
    value.secondary_postal_code,
  ].filter((item) => typeof item === 'string');

  if (secondaryFields.length === 0) {
    return;
  }

  const hasAnySecondary = secondaryFields.some((item) => item.trim().length > 0);
  if (!hasAnySecondary) {
    return;
  }

  if (!value.secondary_address_label?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_address_label'],
      message: 'Secondary address label is required',
    });
  }

  if (!value.secondary_address_line1?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_address_line1'],
      message: 'Secondary address line 1 is required',
    });
  }

  if (!value.secondary_area?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_area'],
      message: 'Secondary area is required',
    });
  }

  if (!value.secondary_city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_city'],
      message: 'Secondary city is required',
    });
  }

  if (!value.secondary_postal_code?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_postal_code'],
      message: 'Secondary postal code is required',
    });
  } else if (!/^\d{6}$/.test(value.secondary_postal_code.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_postal_code'],
      message: 'Secondary postal code must be 6 digits',
    });
  }
});
