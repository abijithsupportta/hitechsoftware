/**
 * GROUP 5 — Product Categories (6 tests)
 * Tests category CRUD via the product-category service layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  addProductCategory,
  editProductCategory,
  getProductCategories,
  removeProductCategory,
} from '@/modules/product-categories/product-category.service';

const mockCategory = {
  id: 'cat-001',
  name: 'Electronics',
  is_active: true,
  is_deleted: false,
  created_at: '2026-03-24T00:00:00.000Z',
  updated_at: '2026-03-24T00:00:00.000Z',
};

describe('Group 5 — Product Categories', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 5.1 — Create category with valid name
  it('5.1 — creates category with valid name successfully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.insert = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({ data: mockCategory, error: null });
      return chain;
    });

    const result = await addProductCategory({ name: 'Electronics' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Electronics');
    }
  });

  // Test 5.2 — Create category with duplicate name same case
  it('5.2 — returns error for duplicate category name (same case)', async () => {
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

    const result = await addProductCategory({ name: 'Electronics' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('category with this name already exists');
    }
  });

  // Test 5.3 — Create category with duplicate name different case
  it('5.3 — returns error for case-insensitive duplicate name', async () => {
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

    const result = await addProductCategory({ name: 'ELECTRONICS' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('category with this name already exists');
    }
  });

  // Test 5.4 — Delete category with no products
  it('5.4 — deletes category that has no products successfully', async () => {
    let callCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      callCount++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = async () => {
        // hasProductsByCategory returns empty array
        return { data: [], error: null };
      };
      chain.update = () => chain;
      chain.single = async () => ({ data: { id: 'cat-001' }, error: null });
      return chain;
    });

    const result = await removeProductCategory('cat-001');
    expect(result.ok).toBe(true);
  });

  // Test 5.5 — Delete category that has active products
  it('5.5 — blocks deletion when category has active products', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = async () => {
        // hasProductsByCategory returns a product, meaning products exist
        return { data: [{ id: 'prod-1' }], error: null };
      };
      chain.update = () => chain;
      chain.single = async () => ({ data: { id: 'cat-001' }, error: null });
      return chain;
    });

    const result = await removeProductCategory('cat-001');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('products are using this category');
    }
  });

  // Test 5.6 — Toggle category inactive
  it('5.6 — toggling category to inactive updates is_active to false', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.update = () => chain;
      chain.eq = () => chain;
      chain.select = () => chain;
      chain.single = async () => ({
        data: { ...mockCategory, is_active: false },
        error: null,
      });
      return chain;
    });

    const result = await editProductCategory('cat-001', { is_active: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.is_active).toBe(false);
    }
  });
});
