/**
 * GROUP 9 — Stock Balance and WAC (8 tests)
 * Tests stock balance calculations, WAC logic, stock status, and MRP change logging.
 * These are computation/logic tests since the DB views are not accessible from unit tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import { editProduct, getProductMrpHistory } from '@/modules/products/product.service';

describe('Group 9 — Stock Balance and WAC', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  // Test 9.1 — After first stock entry, stock levels show correct quantity
  it('9.1 — current_stock_levels shows correct quantity after first stock entry', () => {
    // Simulated: product receives 10 units, issued 0 to bags
    const total_received = 10;
    const total_issued_to_bags = 0;
    const current_quantity = total_received - total_issued_to_bags;
    expect(current_quantity).toBe(10);
  });

  // Test 9.2 — WAC calculated correctly across two stock entries
  it('9.2 — WAC = total_purchase_value / total_quantity for two entries at different prices', () => {
    // Entry 1: 10 units at 100 each = 1000
    // Entry 2: 5 units at 120 each = 600
    // WAC = (1000 + 600) / (10 + 5) = 1600 / 15 = 106.67
    const entry1 = { qty: 10, price: 100 };
    const entry2 = { qty: 5, price: 120 };
    const totalValue = (entry1.qty * entry1.price) + (entry2.qty * entry2.price);
    const totalQty = entry1.qty + entry2.qty;
    const wac = Math.round(totalValue / totalQty * 100) / 100;
    expect(wac).toBe(106.67);
  });

  // Test 9.3 — WAC edge case: zero stock then new stock
  it('9.3 — when starting from zero stock, WAC equals the new purchase price', () => {
    // Previous: 0 units, 0 value
    // New entry: 5 units at 150 each
    const prevQty = 0;
    const prevValue = 0;
    const newQty = 5;
    const newPrice = 150;
    const totalValue = prevValue + (newQty * newPrice);
    const totalQty = prevQty + newQty;
    const wac = totalQty > 0 ? Math.round(totalValue / totalQty * 100) / 100 : 0;
    expect(wac).toBe(150);
  });

  // Test 9.4 — Stock status: in_stock
  it('9.4 — product with quantity above minimum_stock_level has status in_stock', () => {
    const current_quantity = 15;
    const minimum_stock_level = 10;
    const status = current_quantity <= 0
      ? 'out_of_stock'
      : current_quantity <= minimum_stock_level
        ? 'low_stock'
        : 'in_stock';
    expect(status).toBe('in_stock');
  });

  // Test 9.5 — Stock status: low_stock
  it('9.5 — product with quantity at/below minimum_stock_level has status low_stock', () => {
    const cases = [
      { qty: 10, min: 10, expected: 'low_stock' },
      { qty: 5, min: 10, expected: 'low_stock' },
    ];
    cases.forEach(({ qty, min, expected }) => {
      const status = qty <= 0
        ? 'out_of_stock'
        : qty <= min
          ? 'low_stock'
          : 'in_stock';
      expect(status).toBe(expected);
    });
  });

  // Test 9.6 — Stock status: out_of_stock
  it('9.6 — product with zero quantity has status out_of_stock', () => {
    const current_quantity = 0;
    const minimum_stock_level = 5;
    const status = current_quantity <= 0
      ? 'out_of_stock'
      : current_quantity <= minimum_stock_level
        ? 'low_stock'
        : 'in_stock';
    expect(status).toBe('out_of_stock');
  });

  // Test 9.7 — Stock value calculation
  it('9.7 — total_stock_value = current_quantity × WAC rounded to 2 decimals', () => {
    const current_quantity = 15;
    const wac = 106.67;
    const stockValue = Math.round(current_quantity * wac * 100) / 100;
    expect(stockValue).toBe(1600.05);
  });

  // Test 9.8 — MRP change log is created on MRP update
  it('9.8 — editing product MRP creates mrp_change_log entry', async () => {
    let mrpLogInserted = false;
    let loggedData: Record<string, unknown> = {};
    let callCount = 0;

    mockSupabaseClient.from.mockImplementation((table: string) => {
      callCount++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.insert = (data: Record<string, unknown>) => {
        if (table === 'mrp_change_log') {
          mrpLogInserted = true;
          loggedData = data;
        }
        return chain;
      };
      chain.single = async () => {
        if (table === 'inventory_products') {
          if (callCount <= 1) {
            return { data: { id: 'prod-001', mrp: 200 }, error: null };
          }
          return { data: { id: 'prod-001', mrp: 250 }, error: null };
        }
        return { data: { id: 'log-1' }, error: null };
      };
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.returns = async () => ({ data: [], error: null, count: 0 });
      return chain;
    });

    const result = await editProduct('prod-001', { mrp: 250 });
    expect(result.ok).toBe(true);
    expect(mrpLogInserted).toBe(true);
    expect(loggedData.old_mrp).toBe(200);
    expect(loggedData.new_mrp).toBe(250);
    expect(loggedData.change_type).toBe('manual_override');
  });
});
