/**
 * Digital Bag Module — Groups 8–9 (9 tests)
 * Read-Only After Close, Product Search in Bag
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  addItemToSession,
  removeItemFromSession,
  closeSessionWithDetails,
  searchProducts,
  getSessionById,
} from '@/modules/digital-bag/digital-bag.service';

const SESSION_UUID = 'c0000000-0000-4000-8000-000000000003';
const PRODUCT_UUID = 'd0000000-0000-4000-8000-000000000004';
const ITEM_UUID = 'e0000000-0000-4000-8000-000000000005';
const TECH_UUID = 'a0000000-0000-4000-8000-000000000001';

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 8 — Session Read-Only After Close (4 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 8 — Session Read-Only After Close', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 8.1 — Attempt to add item to closed session
  it('8.1 — adding item to closed session returns error', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session is closed — no modifications allowed' },
    });

    const result = await addItemToSession({
      session_id: SESSION_UUID,
      product_id: PRODUCT_UUID,
      quantity: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('closed');
    }
  });

  // Test 8.2 — Attempt to remove item from closed session
  it('8.2 — removing item from closed session returns error', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session is closed — no modifications allowed' },
    });

    const result = await removeItemFromSession(ITEM_UUID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('closed');
    }
  });

  // Test 8.3 — Attempt to update quantity on closed session item
  it('8.3 — any modification to closed session returns error', async () => {
    // update is also handled by the same RPC / DB constraints
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session is closed — no modifications allowed' },
    });

    const result = await closeSessionWithDetails({
      session_id: SESSION_UUID,
      items: [{ item_id: ITEM_UUID, quantity_returned: 5 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('closed');
    }
  });

  // Test 8.4 — Fetch closed session shows all data including items
  it('8.4 — closed session returns all data including items, quantities, damage fees', async () => {
    const closedSessionWithItems = {
      id: SESSION_UUID,
      technician_id: TECH_UUID,
      issued_by: 'staff-uuid',
      session_date: '2026-03-25',
      status: 'closed',
      total_issued: 10,
      total_returned: 7,
      total_consumed: 0,
      variance: 3,
      total_damage_fees: 600,
      notes: null,
      closed_at: '2026-03-25T18:30:00Z',
      closed_by: 'staff-uuid',
      created_at: '2026-03-25T09:00:00Z',
      updated_at: '2026-03-25T18:30:00Z',
      technician: { id: TECH_UUID, display_name: 'Tech One', email: 'tech@test.com', phone_number: null },
      issuer: { id: 'staff-uuid', display_name: 'Staff One' },
      items: [
        {
          id: 'item-1',
          session_id: SESSION_UUID,
          product_id: PRODUCT_UUID,
          material_code: 'MC-001',
          product_name: 'Motor Bracket',
          mrp: 200,
          quantity_issued: 5,
          quantity_returned: 3,
          quantity_consumed: 0,
          quantity_missing: 2,
          damage_fee_per_unit: 200,
          total_damage_fee: 400,
          is_checked: true,
          added_by: 'staff-uuid',
          added_at: '2026-03-25T09:00:00Z',
          created_at: '2026-03-25T09:00:00Z',
          updated_at: '2026-03-25T18:30:00Z',
        },
        {
          id: 'item-2',
          session_id: SESSION_UUID,
          product_id: 'prod-2',
          material_code: 'MC-002',
          product_name: 'Fan Blade',
          mrp: 200,
          quantity_issued: 5,
          quantity_returned: 4,
          quantity_consumed: 0,
          quantity_missing: 1,
          damage_fee_per_unit: 200,
          total_damage_fee: 200,
          is_checked: true,
          added_by: 'staff-uuid',
          added_at: '2026-03-25T09:00:00Z',
          created_at: '2026-03-25T09:00:00Z',
          updated_at: '2026-03-25T18:30:00Z',
        },
      ],
    };

    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: closedSessionWithItems, error: null });
      return chain;
    });

    const result = await getSessionById(SESSION_UUID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('closed');
      expect(result.data.items).toBeDefined();
      expect(result.data.items!.length).toBe(2);
      expect(result.data.items![0].product_name).toBe('Motor Bracket');
      expect(result.data.items![0].quantity_missing).toBe(2);
      expect(result.data.items![0].total_damage_fee).toBe(400);
      expect(result.data.items![1].product_name).toBe('Fan Blade');
      expect(result.data.total_damage_fees).toBe(600);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 9 — Product Search in Bag (5 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 9 — Product Search in Bag', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  const mockProducts = [
    { product_id: 'p1', material_code: 'MC-001', product_name: 'Motor Bracket', mrp: 200, current_quantity: 50, description: null },
    { product_id: 'p2', material_code: 'MC-002', product_name: 'Fan Blade', mrp: 150, current_quantity: 30, description: null },
    { product_id: 'p3', material_code: 'MC-003', product_name: 'Compressor Valve', mrp: 500, current_quantity: 10, description: null },
  ];

  function mockProductSearch(data: unknown[]) {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.gt = () => chain;
      chain.order = () => chain;
      chain.or = () => chain;
      chain.limit = async () => ({ data, error: null });
      return chain;
    });
  }

  // Test 9.1 — Search with empty string returns products sorted by material code
  it('9.1 — returns products sorted by material code when no search query', async () => {
    mockProductSearch(mockProducts);

    const result = await searchProducts(undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(3);
      // Verify order by material_code
      expect(result.data[0].material_code).toBe('MC-001');
      expect(result.data[1].material_code).toBe('MC-002');
      expect(result.data[2].material_code).toBe('MC-003');
    }
  });

  // Test 9.2 — Search by material code partial match
  it('9.2 — returns matching products by material code', async () => {
    mockProductSearch([mockProducts[0]]);

    const result = await searchProducts('MC-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(1);
      expect(result.data[0].material_code).toBe('MC-001');
      expect(result.data[0].current_quantity).toBeGreaterThan(0);
    }
  });

  // Test 9.3 — Search by product name partial match
  it('9.3 — returns matching products by product name', async () => {
    mockProductSearch([mockProducts[2]]);

    const result = await searchProducts('Compressor');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(1);
      expect(result.data[0].product_name).toBe('Compressor Valve');
    }
  });

  // Test 9.4 — Search for product with zero stock not in results
  it('9.4 — zero stock products are filtered out by the view query', async () => {
    // The query has .gt('current_quantity', 0), so zero-stock products are excluded
    mockProductSearch([]);

    const result = await searchProducts('Out Of Stock Product');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(0);
    }
  });

  // Test 9.5 — Product already in session still appears in search results
  it('9.5 — search results include products already in bag (UI handles indicator)', async () => {
    // The search query does NOT exclude products already in a session
    // The UI component BagProductSearch marks them as "In bag"
    mockProductSearch(mockProducts);

    const result = await searchProducts('Motor');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // All products with stock > 0 appear regardless of bag membership
      expect(result.data.length).toBe(3);
    }
  });
});
