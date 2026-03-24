/**
 * Digital Bag Module — Groups 10–11 (10 tests)
 * History and View, Edge Cases
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  getSessionHistory,
  getAllActiveSessions,
  getTodaySession,
  getSessionById,
  createNewSession,
  addItemToSession,
  closeSessionWithDetails,
  searchProducts,
} from '@/modules/digital-bag/digital-bag.service';

const SESSION_UUID = 'c0000000-0000-4000-8000-000000000003';
const TECH_UUID = 'a0000000-0000-4000-8000-000000000001';
const CREATOR_UUID = 'b0000000-0000-4000-8000-000000000002';
const ITEM_UUID = 'e0000000-0000-4000-8000-000000000005';
const TODAY = new Date().toISOString().slice(0, 10);

const mockClosedSession = {
  id: SESSION_UUID,
  technician_id: TECH_UUID,
  issued_by: CREATOR_UUID,
  session_date: '2026-03-25',
  status: 'closed',
  total_issued: 10,
  total_returned: 10,
  total_consumed: 0,
  variance: 0,
  total_damage_fees: 0,
  notes: null,
  closed_at: '2026-03-25T18:00:00Z',
  closed_by: CREATOR_UUID,
  created_at: '2026-03-25T09:00:00Z',
  updated_at: '2026-03-25T18:00:00Z',
  technician: { id: TECH_UUID, display_name: 'Tech One', email: 'tech@test.com', phone_number: null },
  issuer: { id: CREATOR_UUID, display_name: 'Staff One' },
};

const mockOpenSession = {
  ...mockClosedSession,
  id: 'open-session-uuid',
  status: 'open',
  total_returned: 0,
  closed_at: null,
  closed_by: null,
  session_date: TODAY,
  items: [
    {
      id: ITEM_UUID,
      session_id: 'open-session-uuid',
      product_id: 'prod-1',
      material_code: 'MC-001',
      product_name: 'Motor Bracket',
      mrp: 200,
      quantity_issued: 5,
      quantity_returned: 0,
      quantity_consumed: 0,
      quantity_missing: 0,
      damage_fee_per_unit: null,
      total_damage_fee: null,
      is_checked: false,
      added_by: CREATOR_UUID,
      added_at: '2026-03-25T09:00:00Z',
      created_at: '2026-03-25T09:00:00Z',
      updated_at: '2026-03-25T09:00:00Z',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 10 — History and View (5 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 10 — History and View', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 10.1 — Fetch session history for technician
  it('10.1 — returns closed sessions ordered by date descending', async () => {
    const sessions = [
      { ...mockClosedSession, session_date: '2026-03-25' },
      { ...mockClosedSession, id: 'session-2', session_date: '2026-03-24' },
    ];

    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.gte = () => chain;
      chain.lte = () => chain;
      chain.order = () => chain;
      chain.range = async () => ({ data: sessions, error: null, count: 2 });
      return chain;
    });

    const result = await getSessionHistory({ technician_id: TECH_UUID, page: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.data.length).toBe(2);
      expect(result.data.total).toBe(2);
      // First session is most recent
      expect(result.data.data[0].session_date).toBe('2026-03-25');
    }
  });

  // Test 10.2 — Fetch active sessions returns only open sessions
  it('10.2 — returns only open sessions for today', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = async () => ({
        data: [mockOpenSession],
        error: null,
      });
      return chain;
    });

    const result = await getAllActiveSessions();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('open');
    }
  });

  // Test 10.3 — Technician fetches their own my-bag — today's session returned
  it('10.3 — returns today session for technician', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: mockOpenSession, error: null });
      return chain;
    });

    const result = await getTodaySession(TECH_UUID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toBeNull();
      expect(result.data!.technician_id).toBe(TECH_UUID);
      expect(result.data!.session_date).toBe(TODAY);
    }
  });

  // Test 10.4 — Technician tries to fetch another technician's session
  it('10.4 — returns null when no session exists for the technician', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      // RLS prevents seeing other technician's sessions, so maybeSingle returns null
      chain.maybeSingle = async () => ({ data: null, error: null });
      return chain;
    });

    const result = await getTodaySession('other-technician-uuid');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  // Test 10.5 — Fetch session with all items expanded
  it('10.5 — returns session with full items array including all fields', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: mockOpenSession, error: null });
      return chain;
    });

    const result = await getSessionById('open-session-uuid');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toBeDefined();
      expect(result.data.items!.length).toBe(1);
      const item = result.data.items![0];
      expect(item.product_name).toBe('Motor Bracket');
      expect(item.material_code).toBe('MC-001');
      expect(item.mrp).toBe(200);
      expect(item.quantity_issued).toBe(5);
      expect(item.quantity_returned).toBe(0);
      expect(item.quantity_consumed).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 11 — Edge Cases (5 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 11 — Edge Cases', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 11.1 — Create session on day where previous day session was never closed
  it('11.1 — allows new session creation regardless of previous day unclosed session', async () => {
    let callCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      callCount++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.insert = () => chain;
      chain.eq = () => chain;
      if (callCount === 1) {
        // getTodaySession - no session today
        chain.maybeSingle = async () => ({ data: null, error: null });
      } else {
        // createSession - success (UNIQUE constraint is on technician_id+session_date)
        chain.single = async () => ({
          data: { ...mockOpenSession, session_date: TODAY },
          error: null,
        });
      }
      return chain;
    });

    const result = await createNewSession(TECH_UUID, CREATOR_UUID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.session_date).toBe(TODAY);
    }
  });

  // Test 11.2 — Product receives more stock via stock entry, search shows updated stock
  it('11.2 — search reflects updated stock level after new stock entry', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.gt = () => chain;
      chain.order = () => chain;
      chain.or = () => chain;
      chain.limit = async () => ({
        data: [
          { product_id: 'p1', material_code: 'MC-001', product_name: 'Motor', mrp: 200, current_quantity: 150, description: null },
        ],
        error: null,
      });
      return chain;
    });

    const result = await searchProducts('Motor');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Stock was 100, then 50 added via stock entry = 150
      expect(result.data[0].current_quantity).toBe(150);
    }
  });

  // Test 11.3 — Close session with quantity_returned > quantity_issued
  it('11.3 — DB function rejects return quantity exceeding issued amount', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Return quantity (10) exceeds returnable amount (5) for item e0000000-0000-4000-8000-000000000005' },
    });

    const result = await closeSessionWithDetails({
      session_id: SESSION_UUID,
      items: [{ item_id: ITEM_UUID, quantity_returned: 10 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('exceeds');
    }
  });

  // Test 11.4 — Unauthenticated request
  it('11.4 — unauthenticated request returns error', async () => {
    // When not authenticated, Supabase returns auth error
    let callCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      callCount++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.insert = () => chain;
      chain.eq = () => chain;
      if (callCount === 1) {
        chain.maybeSingle = async () => ({ data: null, error: null });
      } else {
        chain.single = async () => ({
          data: null,
          error: { message: 'JWT expired or invalid', code: 'PGRST301' },
        });
      }
      return chain;
    });

    const result = await createNewSession(TECH_UUID, CREATOR_UUID);
    expect(result.ok).toBe(false);
  });

  // Test 11.5 — Session with refurbished item
  it('11.5 — refurbished product is handled by the same issueBagItem flow', async () => {
    // is_refurbished flag lives on inventory_products, not on digital_bag_items
    // The RPC issue_bag_item copies product_name and mrp regardless
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: ITEM_UUID, error: null });

    const result = await addItemToSession({
      session_id: SESSION_UUID,
      product_id: 'refurbished-product-uuid',
      quantity: 1,
    });
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('issue_bag_item', {
      p_session_id: SESSION_UUID,
      p_product_id: 'refurbished-product-uuid',
      p_quantity: 1,
    });
  });
});
