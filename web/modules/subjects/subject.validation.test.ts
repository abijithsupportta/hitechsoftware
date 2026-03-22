// ─────────────────────────────────────────────────────────────────────────────
// subject.validation.test.ts
//
// Unit tests for the Zod validation schemas in subject.validation.ts.
// Tests use createSubjectSchema (the strictest schema — includes created_by)
// so that all superRefine cross-field rules are exercised.
//
// Strategy: start with a fully-valid base payload, then mutate one field per
// test case to isolate the exact rule being tested.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { createSubjectSchema } from '@/modules/subjects/subject.validation';

/**
 * Returns a fresh deep-copy of a fully valid subject payload.
 * Each test mutates its own copy so tests are independent and order-agnostic.
 */
function validBasePayload() {
  return {
    subject_number: 'SUB-2026-001',
    source_type: 'brand' as 'brand' | 'dealer',
    brand_id: '11111111-1111-4111-8111-111111111111',
    dealer_id: '',
    assigned_technician_id: '',
    priority: 'medium' as const,
    priority_reason: 'Customer reported intermittent cooling issue',
    allocated_date: '2026-03-20',
    type_of_service: 'service' as const,
    category_id: '22222222-2222-4222-8222-222222222222',
    customer_phone: '9999999999',
    customer_name: 'Test Customer',
    customer_address: 'Test Address',
    product_name: 'Split AC',
    serial_number: 'SN123456',
    product_description: 'Test product description',
    purchase_date: '2026-01-10',
    warranty_end_date: '2027-01-10',
    amc_start_date: '2027-01-11',
    amc_end_date: '2028-01-11',
    created_by: '33333333-3333-4333-8333-333333333333',
  };
}

describe('subject validation', () => {
  // ── Happy path ──────────────────────────────────────────────────────────
  it('accepts a valid service subject payload', () => {
    // Ensures the base payload (used by all other tests as a starting point)
    // is itself valid — guards against test pollution from bad defaults.
    const parsed = createSubjectSchema.safeParse(validBasePayload());
    expect(parsed.success).toBe(true);
  });

  // ── Cross-field rules ────────────────────────────────────────────────────
  it('requires brand when source_type is brand', () => {
    // Rule 1a: source_type='brand' without brand_id should fail with a field-
    // level error on brand_id so the form shows the message next to the input.
    const payload = validBasePayload();
    payload.brand_id = '';

    const parsed = createSubjectSchema.safeParse(payload);
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join('.') === 'brand_id');
      expect(issue?.message).toContain('Brand is required');
    }
  });

  it('requires dealer when source_type is dealer', () => {
    // Rule 1b: mirrors Rule 1a for dealer source type.
    const payload = validBasePayload();
    payload.source_type = 'dealer';
    payload.brand_id = '';
    payload.dealer_id = '';

    const parsed = createSubjectSchema.safeParse(payload);
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join('.') === 'dealer_id');
      expect(issue?.message).toContain('Dealer is required');
    }
  });

  it('rejects warranty end date before purchase date', () => {
    // Rule 2: warranty_end_date < purchase_date is logically impossible.
    // ISO string comparison works because YYYY-MM-DD sorts lexicographically.
    const payload = validBasePayload();
    payload.purchase_date = '2026-03-20';
    payload.warranty_end_date = '2026-03-19';

    const parsed = createSubjectSchema.safeParse(payload);
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join('.') === 'warranty_end_date');
      expect(issue?.message).toContain('Warranty end date cannot be before purchase date');
    }
  });

  it('requires AMC start date when AMC end date is provided', () => {
    // Rule 3: an AMC end date without a start date makes the period ambiguous.
    // Error is placed on amc_start_date to prompt the user to fill it in.
    const payload = validBasePayload();
    payload.amc_start_date = '';
    payload.amc_end_date = '2028-01-11';

    const parsed = createSubjectSchema.safeParse(payload);
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join('.') === 'amc_start_date');
      expect(issue?.message).toContain('AMC purchase/start date is required');
    }
  });

  it('rejects AMC end date before AMC start date', () => {
    // Rule 4: mirrors the warranty date ordering rule but for the AMC contract.
    const payload = validBasePayload();
    payload.amc_start_date = '2027-06-01';
    payload.amc_end_date = '2027-05-31';

    const parsed = createSubjectSchema.safeParse(payload);
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join('.') === 'amc_end_date');
      expect(issue?.message).toContain('AMC end date cannot be before AMC start date');
    }
  });
});
