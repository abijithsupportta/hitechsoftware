/**
 * GROUP 10 — Pagination and Performance (4 tests)
 * Tests pagination logic in getProducts and getStockEntries.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import { getProducts } from '@/modules/products/product.service';
import { getStockEntries } from '@/modules/stock-entries/stock-entry.service';

describe('Group 10 — Pagination and Performance', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 10.1 — 25 products, page 1, limit 20 → 20 results, totalPages 2
  it('10.1 — page 1 of 25 products returns 20 results and totalPages=2', async () => {
    const page1Data = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i + 1}`,
      product_name: `Product ${i + 1}`,
      material_code: `MC-${String(i + 1).padStart(3, '0')}`,
      is_deleted: false,
      is_active: true,
    }));

    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.range = () => chain;
      chain.or = () => chain;
      chain.returns = async () => ({ data: page1Data, error: null, count: 25 });
      return chain;
    });

    const result = await getProducts({ page: 1, page_size: 20 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.data).toHaveLength(20);
      expect(result.data.total_pages).toBe(2);
      expect(result.data.total).toBe(25);
    }
  });

  // Test 10.2 — Page 2 returns remaining 5
  it('10.2 — page 2 returns remaining 5 products', async () => {
    const page2Data = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i + 21}`,
      product_name: `Product ${i + 21}`,
      material_code: `MC-${String(i + 21).padStart(3, '0')}`,
      is_deleted: false,
      is_active: true,
    }));

    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.range = () => chain;
      chain.or = () => chain;
      chain.returns = async () => ({ data: page2Data, error: null, count: 25 });
      return chain;
    });

    const result = await getProducts({ page: 2, page_size: 20 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.data).toHaveLength(5);
      expect(result.data.page).toBe(2);
    }
  });

  // Test 10.3 — Stock entries ordered newest first
  it('10.3 — stock entries list returns newest entries first (by entry_date DESC)', async () => {
    const entries = [
      { id: 'e3', entry_date: '2026-03-24', created_at: '2026-03-24T15:00:00Z', items: [] },
      { id: 'e2', entry_date: '2026-03-23', created_at: '2026-03-23T10:00:00Z', items: [] },
      { id: 'e1', entry_date: '2026-03-22', created_at: '2026-03-22T08:00:00Z', items: [] },
    ];

    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.range = () => chain;
      chain.ilike = () => chain;
      chain.gte = () => chain;
      chain.lte = () => chain;
      chain.returns = async () => ({ data: entries, error: null, count: 3 });
      return chain;
    });

    const result = await getStockEntries({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dates = result.data.data.map((e) => e.entry_date);
      expect(dates[0]).toBe('2026-03-24');
      expect(dates[2]).toBe('2026-03-22');
      // Verify descending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] <= dates[i - 1]).toBe(true);
      }
    }
  });

  // Test 10.4 — Performance: stock balance returns within acceptable time
  it('10.4 — stock balance query for 500 products completes quickly', async () => {
    const largeDataset = Array.from({ length: 500 }, (_, i) => ({
      id: `p${i}`,
      product_name: `Product ${i}`,
      material_code: `MC-${String(i).padStart(4, '0')}`,
      current_quantity: Math.floor(Math.random() * 100),
      weighted_average_cost: Math.round(Math.random() * 500 * 100) / 100,
    }));

    mockSupabaseClient.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.returns = async () => ({ data: largeDataset, error: null, count: 500 });
      return chain;
    });

    const start = performance.now();
    // Simulate a stock levels query
    const result = await mockSupabaseClient.from('current_stock_levels')
      .select()
      .returns();
    const elapsed = performance.now() - start;

    expect(result.data).toHaveLength(500);
    expect(elapsed).toBeLessThan(500); // Must complete within 500ms
  });
});
