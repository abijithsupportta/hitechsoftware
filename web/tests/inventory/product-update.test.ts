/**
 * GROUP 2 — Product Update (8 tests)
 * Tests the editProduct service function.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import { editProduct } from '@/modules/products/product.service';
import { hasPermission } from '@/config/permissions';

const CATEGORY_UUID = '10000000-0000-4000-8000-000000000001';
const TYPE_UUID = '20000000-0000-4000-8000-000000000002';
const PRODUCT_UUID = '30000000-0000-4000-8000-000000000003';

const existingProduct = {
  id: PRODUCT_UUID,
  product_name: 'Old Name',
  material_code: 'MC-001',
  description: null,
  category_id: CATEGORY_UUID,
  product_type_id: TYPE_UUID,
  is_refurbished: false,
  refurbished_label: null,
  hsn_sac_code: '8501',
  purchase_price: 100,
  mrp: 200,
  default_purchase_price: null,
  minimum_selling_price: null,
  weighted_average_cost: null,
  minimum_stock_level: 5,
  stock_classification: 'unclassified',
  is_active: true,
  is_deleted: false,
  created_at: '2026-03-24T00:00:00.000Z',
  updated_at: '2026-03-24T00:00:00.000Z',
  category: { id: CATEGORY_UUID, name: 'Electronics' },
  product_type: { id: TYPE_UUID, name: 'Spare Part' },
};

describe('Group 2 — Product Update', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 2.1 — Update product name
  it('2.1 — updates product name and updated_at changes', async () => {
    const newUpdatedAt = '2026-03-24T12:00:00.000Z';
    // For name-only update (no MRP change), editProduct only calls updateProduct
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.single = async () => ({
        data: { ...existingProduct, product_name: 'New Name', updated_at: newUpdatedAt },
        error: null,
      });
      return chain;
    });

    const result = await editProduct(PRODUCT_UUID, { product_name: 'New Name' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.product_name).toBe('New Name');
      expect(result.data.updated_at).toBe(newUpdatedAt);
    }
  });

  // Test 2.2 — Update MRP — expect mrp_change_log entry
  it('2.2 — creates mrp_change_log entry when MRP changes', async () => {
    let mrpLogInserted = false;
    let productCallCount = 0;

    mockSupabaseClient.from.mockImplementation((table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => {
        productCallCount++;
        return chain;
      };
      chain.insert = () => {
        if (table === 'mrp_change_log') {
          mrpLogInserted = true;
        }
        return chain;
      };
      chain.single = async () => {
        if (table === 'inventory_products') {
          if (productCallCount === 0) {
            return { data: existingProduct, error: null }; // findProductById
          }
          return { data: { ...existingProduct, mrp: 300 }, error: null }; // updateProduct
        }
        return { data: { id: '60000000-0000-4000-8000-000000000006' }, error: null }; // mrp_change_log insert
      };
      return chain;
    });

    const result = await editProduct(PRODUCT_UUID, { mrp: 300 });
    expect(result.ok).toBe(true);
    expect(mrpLogInserted).toBe(true);
  });

  // Test 2.3 — Update material code to one that already exists
  it('2.3 — returns error for duplicate material code on update', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.single = async () => ({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      });
      return chain;
    });

    const result = await editProduct(PRODUCT_UUID, { material_code: 'EXISTING-CODE' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('material code already exists');
    }
  });

  // Test 2.4 — Update product with same material code as itself
  it('2.4 — succeeds when updating with same material code', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.single = async () => ({
        data: { ...existingProduct },
        error: null,
      });
      return chain;
    });

    const result = await editProduct(PRODUCT_UUID, { material_code: 'MC-001' });
    expect(result.ok).toBe(true);
  });

  // Test 2.5 — Update minimum stock level to negative
  it('2.5 — returns validation error for negative minimum stock level', async () => {
    const result = await editProduct(PRODUCT_UUID, { minimum_stock_level: -5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.toLowerCase()).toMatch(/must be 0|min/);
    }
  });

  // Test 2.6 — Update product that does not exist
  it('2.6 — returns error when product does not exist', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.single = async () => ({
        data: null,
        error: { message: 'Row not found', code: 'PGRST116' },
      });
      return chain;
    });

    const result = await editProduct('90000000-0000-4000-8000-000000000009', { product_name: 'Anything' });
    expect(result.ok).toBe(false);
  });

  // Test 2.7 — Stock manager has inventory:edit permission
  it('2.7 — stock_manager role has inventory:edit permission', () => {
    expect(hasPermission('stock_manager', 'inventory:edit')).toBe(true);
  });

  // Test 2.8 — Technician does NOT have inventory:edit permission
  it('2.8 — technician role does not have inventory:edit permission', () => {
    expect(hasPermission('technician', 'inventory:edit')).toBe(false);
  });
});
