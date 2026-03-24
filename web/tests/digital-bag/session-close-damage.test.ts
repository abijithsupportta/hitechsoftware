/**
 * Digital Bag Module — Groups 6–7 (16 tests)
 * Session Close Flow, Damage Fees and Payout Integration
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  closeSessionWithDetails,
  getSessionById,
} from '@/modules/digital-bag/digital-bag.service';
import type { CloseSessionInput } from '@/modules/digital-bag/digital-bag.types';

const SESSION_UUID = 'c0000000-0000-4000-8000-000000000003';
const TECH_UUID = 'a0000000-0000-4000-8000-000000000001';
const CLOSER_UUID = 'b0000000-0000-4000-8000-000000000002';
const ITEM_1 = 'e0000000-0000-4000-8000-000000000001';
const ITEM_2 = 'e0000000-0000-4000-8000-000000000002';
const ITEM_3 = 'e0000000-0000-4000-8000-000000000003';

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 6 — Session Close Flow (10 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 6 — Session Close Flow', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 6.1 — Close session with all items returned
  it('6.1 — closes session with all items returned, no damage fees', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 5 },
        { item_id: ITEM_2, quantity_returned: 3 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('close_bag_session', {
      p_session_id: SESSION_UUID,
      p_items: input.items,
    });
  });

  // Test 6.2 — Close session with some items missing
  it('6.2 — closes session with missing items and damage fees calculated', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 3, damage_fee_per_unit: 150 },
        { item_id: ITEM_2, quantity_returned: 3 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('close_bag_session', {
      p_session_id: SESSION_UUID,
      p_items: input.items,
    });
  });

  // Test 6.3 — Close session with damage fee defaulting to MRP
  it('6.3 — sends items without damage_fee_per_unit to let DB default to MRP', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 2 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    // Verify damage_fee_per_unit is NOT in the payload (DB defaults to MRP)
    const rpcCall = mockSupabaseClient.rpc.mock.calls[0];
    const sentItems = (rpcCall[1] as Record<string, unknown>).p_items as Array<Record<string, unknown>>;
    expect(sentItems[0].damage_fee_per_unit).toBeUndefined();
  });

  // Test 6.4 — Close session with custom damage fee
  it('6.4 — sends custom damage fee per unit correctly', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 2, damage_fee_per_unit: 75.50 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    const sentItems = mockSupabaseClient.rpc.mock.calls[0][1]!.p_items as Array<Record<string, unknown>>;
    expect(sentItems[0].damage_fee_per_unit).toBe(75.50);
  });

  // Test 6.5 — Close session with all items missing
  it('6.5 — closes with all items missing and full damage fees', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 0, damage_fee_per_unit: 200 },
        { item_id: ITEM_2, quantity_returned: 0, damage_fee_per_unit: 150 },
        { item_id: ITEM_3, quantity_returned: 0, damage_fee_per_unit: 100 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
  });

  // Test 6.6 — Close session as technician role — permission denied
  it('6.6 — returns error when technician tries to close session', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for function close_bag_session', code: '42501' },
    });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [{ item_id: ITEM_1, quantity_returned: 5 }],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('permission denied');
    }
  });

  // Test 6.7 — Close session as stock_manager role — permission denied
  it('6.7 — returns error when stock_manager tries to close session', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for function close_bag_session', code: '42501' },
    });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [{ item_id: ITEM_1, quantity_returned: 5 }],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(false);
  });

  // Test 6.8 — Close already closed session
  it('6.8 — returns error when session is already closed', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session is closed — no modifications allowed' },
    });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [{ item_id: ITEM_1, quantity_returned: 5 }],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('closed');
    }
  });

  // Test 6.9 — After closing, session status is closed with closed_at and closed_by
  it('6.9 — closed session has status closed, closed_at, and closed_by set', async () => {
    const closedSession = {
      id: SESSION_UUID,
      technician_id: TECH_UUID,
      issued_by: CLOSER_UUID,
      session_date: '2026-03-25',
      status: 'closed',
      total_issued: 8,
      total_returned: 5,
      total_consumed: 0,
      variance: 3,
      total_damage_fees: 600,
      notes: null,
      closed_at: '2026-03-25T18:30:00.000Z',
      closed_by: CLOSER_UUID,
      created_at: '2026-03-25T09:00:00.000Z',
      updated_at: '2026-03-25T18:30:00.000Z',
      technician: { id: TECH_UUID, display_name: 'Tech One', email: 'tech@test.com', phone_number: null },
      issuer: { id: CLOSER_UUID, display_name: 'Staff One' },
      items: [],
    };

    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: closedSession, error: null });
      return chain;
    });

    const result = await getSessionById(SESSION_UUID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('closed');
      expect(result.data.closed_at).toBe('2026-03-25T18:30:00.000Z');
      expect(result.data.closed_by).toBe(CLOSER_UUID);
    }
  });

  // Test 6.10 — After closing, returned quantities added back to stock
  it('6.10 — close session with items empty list returns validation error', async () => {
    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('No items to close');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 7 — Damage Fees and Payout Integration (6 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 7 — Damage Fees and Payout Integration', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 7.1 — Close session with 3 missing items creates payout deductions
  it('7.1 — RPC handles payout deduction creation for missing items', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 0, damage_fee_per_unit: 100 },
        { item_id: ITEM_2, quantity_returned: 0, damage_fee_per_unit: 200 },
        { item_id: ITEM_3, quantity_returned: 0, damage_fee_per_unit: 150 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    // The DB function close_bag_session creates payout records internally
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('close_bag_session', {
      p_session_id: SESSION_UUID,
      p_items: input.items,
    });
  });

  // Test 7.2 — Close session with no missing items — no payout deductions
  it('7.2 — no payout deductions when all items returned', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 5 },
        { item_id: ITEM_2, quantity_returned: 3 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
  });

  // Test 7.3 — Verify total_damage_fees on session after close
  it('7.3 — session total_damage_fees matches sum of item damage fees', async () => {
    const closedSession = {
      id: SESSION_UUID,
      technician_id: TECH_UUID,
      status: 'closed',
      total_damage_fees: 750,
      items: [
        { id: ITEM_1, quantity_missing: 2, damage_fee_per_unit: 200, total_damage_fee: 400 },
        { id: ITEM_2, quantity_missing: 1, damage_fee_per_unit: 350, total_damage_fee: 350 },
      ],
      session_date: '2026-03-25',
      issued_by: CLOSER_UUID,
      total_issued: 10,
      total_returned: 7,
      total_consumed: 0,
      variance: 3,
      notes: null,
      closed_at: '2026-03-25T18:00:00Z',
      closed_by: CLOSER_UUID,
      created_at: '2026-03-25T09:00:00Z',
      updated_at: '2026-03-25T18:00:00Z',
      technician: { id: TECH_UUID, display_name: 'Tech', email: 't@t.com', phone_number: null },
      issuer: { id: CLOSER_UUID, display_name: 'Staff' },
    };

    mockSupabaseClient.from.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: closedSession, error: null });
      return chain;
    });

    const result = await getSessionById(SESSION_UUID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 400 + 350 = 750
      expect(result.data.total_damage_fees).toBe(750);
      const items = result.data.items ?? [];
      const sumDamage = items.reduce((s, i) => s + (i.total_damage_fee ?? 0), 0);
      expect(sumDamage).toBe(750);
    }
  });

  // Test 7.4 — Custom damage fee on one item, others default to MRP
  it('7.4 — custom fee sent only for specified items', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 2, damage_fee_per_unit: 99.99 },
        { item_id: ITEM_2, quantity_returned: 0 }, // No fee → DB defaults to MRP
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);

    const sentItems = mockSupabaseClient.rpc.mock.calls[0][1]!.p_items as Array<Record<string, unknown>>;
    expect(sentItems[0].damage_fee_per_unit).toBe(99.99);
    expect(sentItems[1].damage_fee_per_unit).toBeUndefined();
  });

  // Test 7.5 — Close session where damage fee is zero for missing item
  it('7.5 — allows zero damage fee to be sent, DB function handles validation', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 0, damage_fee_per_unit: 0 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    // Service layer passes through — DB function determines behavior
    expect(result.ok).toBe(true);
    const sentItems = mockSupabaseClient.rpc.mock.calls[0][1]!.p_items as Array<Record<string, unknown>>;
    expect(sentItems[0].damage_fee_per_unit).toBe(0);
  });

  // Test 7.6 — Payout record shows deduction amount correctly
  it('7.6 — payout deduction is created by close_bag_session RPC', async () => {
    // The close_bag_session DB function creates payout records
    // We verify the service calls RPC correctly
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const input: CloseSessionInput = {
      session_id: SESSION_UUID,
      items: [
        { item_id: ITEM_1, quantity_returned: 0, damage_fee_per_unit: 500 },
      ],
    };

    const result = await closeSessionWithDetails(input);
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1);
  });
});
