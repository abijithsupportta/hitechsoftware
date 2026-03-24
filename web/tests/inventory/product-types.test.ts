/**
 * GROUP 6 — Product Types (4 tests)
 * Tests product type CRUD via the product-type service layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  addProductType,
  removeProductType,
} from '@/modules/product-types/product-type.service';

const mockType = {
  id: 'type-001',
  name: 'Spare Part',
  is_active: true,
  is_deleted: false,
  created_at: '2026-03-24T00:00:00.000Z',
  updated_at: '2026-03-24T00:00:00.000Z',
};

describe('Group 6 — Product Types', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 6.1 — Create product type with valid name
  it('6.1 — creates product type with valid name successfully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({ data: mockType, error: null });
      return chain;
    });

    const result = await addProductType({ name: 'Spare Part' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Spare Part');
    }
  });

  // Test 6.2 — Create product type with duplicate name
  it('6.2 — returns error for duplicate product type name', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      });
      return chain;
    });

    const result = await addProductType({ name: 'Spare Part' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('product type with this name already exists');
    }
  });

  // Test 6.3 — Delete product type with no products
  it('6.3 — deletes product type with no products successfully', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = async () => ({ data: [], error: null });
      chain.update = () => chain;
      chain.single = async () => ({ data: { id: 'type-001' }, error: null });
      return chain;
    });

    const result = await removeProductType('type-001');
    expect(result.ok).toBe(true);
  });

  // Test 6.4 — Delete product type with active products
  it('6.4 — blocks deletion when products are using this type', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = async () => ({ data: [{ id: 'prod-1' }], error: null });
      chain.update = () => chain;
      chain.single = async () => ({ data: { id: 'type-001' }, error: null });
      return chain;
    });

    const result = await removeProductType('type-001');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('products are using this type');
    }
  });
});
