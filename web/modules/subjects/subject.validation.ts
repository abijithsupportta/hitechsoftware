// ─────────────────────────────────────────────────────────────────────────────
// subject.validation.ts
//
// Zod schemas for the Subject (service job) domain.
// Used in the service layer (subject.service.ts) to validate form data before
// any database write. Validation runs server-side via safeParse(), so errors
// are caught before hitting the DB and returned as user-friendly messages.
//
// Cross-field rules are declared with superRefine() rather than individual
// .refine() calls, because superRefine receives the whole parsed object and
// can add issues to specific field paths (shown inline next to the field in
// the form UI by react-hook-form's resolver).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

/**
 * Validates the subject reference number.
 * Trimmed before comparison so accidental whitespace doesn't fail validation.
 * Min 3 chars: prevents single-char ticket numbers.
 * Max 50 chars: DB column constraint; prevents overflow.
 */
export const subjectNumberSchema = z
  .string()
  .trim()
  .min(3, 'Subject number is required')
  .max(50, 'Subject number is too long');

/** Restricts priority to the four supported levels — mirrors the DB CHECK constraint. */
export const subjectPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

/**
 * Core form schema shared by both create and update operations.
 * Covers all fields the admin/office-staff fills in on the subject form.
 *
 * Optional string fields use `.optional().or(z.literal(''))` so that an
 * empty <input> value ('') is treated the same as an absent field — both
 * are normalised to undefined/null in normalizeSubjectPayload() before
 * the DB write, preventing empty strings from being stored.
 *
 * Cross-field rules (in superRefine below):
 *   1. brand_id required when source_type === 'brand'
 *   2. dealer_id required when source_type === 'dealer'
 *   3. warranty_end_date must not be before purchase_date
 *   4. amc_start_date required when amc_end_date is provided
 *   5. amc_end_date must not be before amc_start_date
 */
export const subjectFormSchema = z
  .object({
    subject_number: subjectNumberSchema,
    source_type: z.enum(['brand', 'dealer']),
    brand_id: z.string().uuid('Invalid brand id').optional().or(z.literal('')),
    dealer_id: z.string().uuid('Invalid dealer id').optional().or(z.literal('')),
    assigned_technician_id: z.string().uuid('Invalid technician id').optional().or(z.literal('')),
    priority: subjectPrioritySchema,
    priority_reason: z.string().trim().min(5, 'Priority reason is required').max(1000, 'Reason is too long'),
    allocated_date: z.string().min(10, 'Allocated date is required'),
    type_of_service: z.enum(['installation', 'service']),
    category_id: z.string().uuid('Category is required'),
    customer_phone: z.string().trim().max(20).optional().or(z.literal('')),
    customer_name: z.string().trim().max(255).optional().or(z.literal('')),
    customer_address: z.string().trim().max(2000).optional().or(z.literal('')),
    product_name: z.string().trim().max(255).optional().or(z.literal('')),
    serial_number: z.string().trim().max(255).optional().or(z.literal('')),
    product_description: z.string().trim().max(2000).optional().or(z.literal('')),
    purchase_date: z.string().optional().or(z.literal('')),
    warranty_end_date: z.string().optional().or(z.literal('')),
    amc_start_date: z.string().optional().or(z.literal('')),
    amc_end_date: z.string().optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    // Rule 1: source FK — the source record must be identified.
    // A 'brand' subject must link to a brand; a 'dealer' subject to a dealer.
    // The form shows/hides brand_id vs dealer_id based on source_type so only
    // one of the two is ever populated at a time.
    if (value.source_type === 'brand' && !value.brand_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_id'],
        message: 'Brand is required when source is brand.',
      });
    }

    if (value.source_type === 'dealer' && !value.dealer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealer_id'],
        message: 'Dealer is required when source is dealer.',
      });
    }

    // Rule 2: warranty date ordering — end date must not precede purchase date.
    // ISO date strings compare correctly with < / > because they are YYYY-MM-DD.
    if (value.purchase_date && value.warranty_end_date && value.warranty_end_date < value.purchase_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['warranty_end_date'],
        message: 'Warranty end date cannot be before purchase date.',
      });
    }

    // Rule 3: AMC start required when end is set.
    // Without a start date the AMC period is ambiguous and cannot be displayed
    // or compared to today for active/expired calculation.
    if (value.amc_end_date && !value.amc_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amc_start_date'],
        message: 'AMC purchase/start date is required when AMC end date is set.',
      });
    }

    // Rule 4: AMC date ordering — end must not precede start.
    if (value.amc_start_date && value.amc_end_date && value.amc_end_date < value.amc_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amc_end_date'],
        message: 'AMC end date cannot be before AMC start date.',
      });
    }
  });

/**
 * Schema for the subject creation form.
 * Extends subjectFormSchema with `created_by` (the authenticated user's UUID)
 * appended by the service layer before calling the repository — never comes
 * from the form itself, only from the server-side auth context.
 */
export const createSubjectSchema = subjectFormSchema.extend({
  created_by: z.string().uuid('Invalid creator id'),
});

/**
 * Schema for the subject edit form.
 * Identical to subjectFormSchema — `created_by` is not re-captured on update.
 */
export const updateSubjectSchema = subjectFormSchema;
