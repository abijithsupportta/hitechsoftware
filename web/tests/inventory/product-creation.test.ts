/**
 * GROUP 1 — Product Creation (10 tests)
 * Tests the addProduct service function and createProductSchema validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import { addProduct } from '@/modules/products/product.service';
import { createProductSchema } from '@/modules/products/product.validation';

// Valid product input used as baseline
const CATEGORY_UUID = '10000000-0000-4000-8000-000000000001';
const TYPE_UUID = '20000000-0000-4000-8000-000000000002';
const PRODUCT_UUID = '30000000-0000-4000-8000-000000000003';

const validProduct = {
  product_name: 'Test Motor Bracket',
  material_code: 'MC-001',
  category_id: CATEGORY_UUID,
  product_type_id: TYPE_UUID,
  is_refurbished: false,
  refurbished_label: null,
  hsn_sac_code: '8501',
  purchase_price: 100,
  mrp: 200,
  minimum_stock_level: 5,
  is_active: true,
};

const mockProductResponse = {
  id: PRODUCT_UUID,
  ...validProduct,
  material_code: 'MC-001',
  description: null,
  default_purchase_price: null,
  minimum_selling_price: null,
  weighted_average_cost: null,
  stock_classification: 'unclassified',
  is_deleted: false,
  created_at: '2026-03-24T00:00:00.000Z',
  updated_at: '2026-03-24T00:00:00.000Z',
  category: { id: CATEGORY_UUID, name: 'Electronics' },
  product_type: { id: TYPE_UUID, name: 'Spare Part' },
};

describe('Group 1 — Product Creation', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 1.1 — Create product with all valid fields
  it('1.1 — creates product with all valid fields and returns product with id', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({ data: mockProductResponse, error: null });
      return chain;
    });

    const result = await addProduct(validProduct);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(PRODUCT_UUID);
      expect(result.data.product_name).toBe('Test Motor Bracket');
      expect(result.data.material_code).toBe('MC-001');
    }
  });

  // Test 1.2 — Create product with duplicate material code
  it('1.2 — returns error for duplicate material code', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      });
      return chain;
    });

    const result = await addProduct(validProduct);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('material code already exists');
    }
  });

  // Test 1.3 — Create product with material code in lowercase — stored as uppercase
  it('1.3 — stores material code as uppercase automatically', async () => {
    let insertedPayload: Record<string, unknown> = {};
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = (data: Record<string, unknown>) => {
        insertedPayload = data;
        return chain;
      };
      chain.select = () => chain;
      chain.single = async () => ({
        data: { ...mockProductResponse, material_code: 'MC-LOWER' },
        error: null,
      });
      return chain;
    });

    const result = await addProduct({ ...validProduct, material_code: 'mc-lower' });
    expect(result.ok).toBe(true);
    // The repository uppercases the material_code before inserting
    expect(insertedPayload.material_code).toBe('MC-LOWER');
  });

  // Test 1.4 — Create product with empty product name
  it('1.4 — returns validation error when product name is empty', async () => {
    const result = await addProduct({ ...validProduct, product_name: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.toLowerCase()).toContain('product name');
    }
  });

  // Test 1.5 — Create product with empty material code
  it('1.5 — returns validation error when material code is empty', async () => {
    const result = await addProduct({ ...validProduct, material_code: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.toLowerCase()).toContain('material code');
    }
  });

  // Test 1.6 — Create product with material code containing spaces
  it('1.6 — returns validation error for material code with spaces', async () => {
    const result = await addProduct({ ...validProduct, material_code: 'MC 001' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.toLowerCase()).toMatch(/material code|letters|numbers|hyphens/);
    }
  });

  // Test 1.7 — Create product with MRP lower than purchase price
  it('1.7 — allows creation when MRP is lower than purchase price (warning, not blocking)', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({
        data: { ...mockProductResponse, mrp: 50, purchase_price: 100 },
        error: null,
      });
      return chain;
    });

    const result = await addProduct({ ...validProduct, mrp: 50, purchase_price: 100 });
    expect(result.ok).toBe(true);
  });

  // Test 1.8 — Create product with zero MRP
  it('1.8 — allows zero MRP (validation allows min 0)', async () => {
    // Validation schema has .min(0), so 0 is valid. Test verifies this.
    const parsed = createProductSchema.safeParse({ ...validProduct, mrp: 0 });
    expect(parsed.success).toBe(true);

    // But negative MRP should fail
    const parsedNeg = createProductSchema.safeParse({ ...validProduct, mrp: -1 });
    expect(parsedNeg.success).toBe(false);
  });

  // Test 1.9 — Create product with negative purchase price
  it('1.9 — returns validation error for negative purchase price', async () => {
    const result = await addProduct({ ...validProduct, purchase_price: -10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.toLowerCase()).toContain('purchase price');
    }
  });

  // Test 1.10 — Create product without category
  it('1.10 — allows creation without category (category_id is optional)', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({
        data: { ...mockProductResponse, category_id: null, category: null },
        error: null,
      });
      return chain;
    });

    // category_id is optional/nullish in the schema — creation should succeed
    const result = await addProduct({ ...validProduct, category_id: null });
    expect(result.ok).toBe(true);
  });
});
