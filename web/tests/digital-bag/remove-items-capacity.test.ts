/**
 * Digital Bag Module — Groups 4–5 (9 tests)
 * Removing Items from Session, Session Capacity
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient } from '@/tests/setup';
import {
  removeItemFromSession,
  addItemToSession,
  getBagCapacity,
} from '@/modules/digital-bag/digital-bag.service';
import { BAG_CAPACITY } from '@/modules/digital-bag/digital-bag.constants';

const SESSION_UUID = 'c0000000-0000-4000-8000-000000000003';
const PRODUCT_UUID = 'd0000000-0000-4000-8000-000000000004';
const ITEM_UUID = 'e0000000-0000-4000-8000-000000000005';

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 4 — Removing Items from Session (5 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 4 — Removing Items from Session', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 4.1 — Remove item from open session
  it('4.1 — removes item successfully from open session', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await removeItemFromSession(ITEM_UUID);
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('remove_bag_item', {
      p_item_id: ITEM_UUID,
    });
  });

  // Test 4.2 — Remove item from closed session
  it('4.2 — returns error when removing from closed session', async () => {
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

  // Test 4.3 — Remove item that does not belong to this session
  it('4.3 — returns error when item not found', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Item not found' },
    });

    const result = await removeItemFromSession('nonexistent-item-uuid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Item not found');
    }
  });

  // Test 4.4 — After removing item, session total_items_issued decreases
  it('4.4 — session totals update after item removal (trigger-based)', async () => {
    // The session totals are updated by the DB trigger trg_update_session_totals
    // We verify that remove calls the correct RPC
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await removeItemFromSession(ITEM_UUID);
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('remove_bag_item', {
      p_item_id: ITEM_UUID,
    });
  });

  // Test 4.5 — Remove item as technician role — permission denied
  it('4.5 — returns RLS error when technician tries to remove item', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for function remove_bag_item', code: '42501' },
    });

    const result = await removeItemFromSession(ITEM_UUID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('permission denied');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 5 — Session Capacity (4 tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('Group 5 — Session Capacity', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  // Test 5.1 — Add items up to exactly 50 total quantity
  it('5.1 — succeeds when adding up to exactly 50 items', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: ITEM_UUID, error: null });

    const result = await addItemToSession({
      session_id: SESSION_UUID,
      product_id: PRODUCT_UUID,
      quantity: 50,
    });
    expect(result.ok).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('issue_bag_item', {
      p_session_id: SESSION_UUID,
      p_product_id: PRODUCT_UUID,
      p_quantity: 50,
    });
  });

  // Test 5.2 — Add one more item after reaching 50 total
  it('5.2 — returns bag full error when exceeding 50 items', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Bag is full — maximum 50 items reached' },
    });

    const result = await addItemToSession({
      session_id: SESSION_UUID,
      product_id: PRODUCT_UUID,
      quantity: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('maximum 50 items');
    }
  });

  // Test 5.3 — Remove one item from full bag then add new item
  it('5.3 — can add item after removing from full bag', async () => {
    // Remove
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });
    const removeResult = await removeItemFromSession(ITEM_UUID);
    expect(removeResult.ok).toBe(true);

    // Add
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: 'new-item-uuid', error: null });
    const addResult = await addItemToSession({
      session_id: SESSION_UUID,
      product_id: PRODUCT_UUID,
      quantity: 1,
    });
    expect(addResult.ok).toBe(true);
  });

  // Test 5.4 — getBagCapacity accurately tracks items
  it('5.4 — getBagCapacity returns correct counts', () => {
    const full = getBagCapacity(50);
    expect(full.total_capacity).toBe(BAG_CAPACITY);
    expect(full.items_issued).toBe(50);
    expect(full.remaining).toBe(0);
    expect(full.is_full).toBe(true);

    const partial = getBagCapacity(30);
    expect(partial.remaining).toBe(20);
    expect(partial.is_full).toBe(false);

    const empty = getBagCapacity(0);
    expect(empty.remaining).toBe(50);
    expect(empty.is_full).toBe(false);

    // Edge: over capacity (should not happen but must handle)
    const over = getBagCapacity(55);
    expect(over.remaining).toBe(0);
    expect(over.is_full).toBe(true);
  });
});
