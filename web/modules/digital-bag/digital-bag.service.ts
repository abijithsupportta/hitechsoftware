/**
 * @file digital-bag.service.ts
 * @module modules/digital-bag
 *
 * Business logic for Digital Bag sessions, items, and consumptions.
 *
 * ARCHITECTURE
 * Hook → THIS SERVICE → Repository → Supabase
 */
import type { ServiceResult } from '@/types/common.types';
import {
  listSessions,
  findSessionById,
  createSession as repoCreateSession,
  closeSession,
  addSessionItems,
  returnBagItem,
  addConsumption,
  listTechnicianBagItems,
  listConsumptionsBySubject,
  getBagCapacityRemaining,
  getTodaySession as repoGetTodaySession,
  listTodaySessions,
  listSessionHistory as repoListHistory,
  issueBagItem,
  removeBagItem,
  closeBagSession as repoCloseBag,
  searchAvailableProducts as repoSearchProducts,
} from '@/repositories/digital-bag.repository';
import type {
  BagSessionListResponse,
  BagSessionFilters,
  DigitalBagSessionWithProfiles,
  DigitalBagSession,
  DigitalBagItem,
  AddItemInput,
  CloseSessionInput,
  SessionHistoryFilters,
  SessionListResponse,
  AvailableProduct,
  BagCapacityStatus,
  ReturnItemsInput,
  ConsumeItemInput,
  TechnicianBagSummary,
} from './digital-bag.types';
import { BAG_CAPACITY } from './digital-bag.constants';

const PAGE_SIZE = 20;

function mapError(message?: string): string {
  return message?.trim() ?? 'Failed to process digital bag operation';
}

// ── Core Functions (new workflow) ────────────────────────────────────────────

export async function getTodaySession(
  technicianId: string,
): Promise<ServiceResult<DigitalBagSession | null>> {
  const result = await repoGetTodaySession(technicianId);
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: (result.data as unknown as DigitalBagSession) ?? null };
}

export async function createNewSession(
  technicianId: string,
  createdBy: string,
): Promise<ServiceResult<DigitalBagSession>> {
  if (!technicianId) return { ok: false, error: { message: 'Technician is required' } };

  // Check if an open session already exists today
  const existing = await repoGetTodaySession(technicianId);
  if (existing.data) {
    return { ok: false, error: { message: 'A session already exists for this technician today' } };
  }

  const result = await repoCreateSession({ technician_id: technicianId, issued_by: createdBy });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as DigitalBagSession };
}

export async function getSessionById(
  sessionId: string,
): Promise<ServiceResult<DigitalBagSession>> {
  const result = await findSessionById(sessionId);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message ?? 'Session not found') } };
  }
  return { ok: true, data: result.data as unknown as DigitalBagSession };
}

export async function getAllActiveSessions(): Promise<ServiceResult<DigitalBagSession[]>> {
  const result = await listTodaySessions();
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: (result.data ?? []) as unknown as DigitalBagSession[] };
}

export async function addItemToSession(
  input: AddItemInput,
): Promise<ServiceResult<{ id: string }>> {
  if (input.quantity < 1) return { ok: false, error: { message: 'Quantity must be at least 1' } };

  const result = await issueBagItem(input.session_id, input.product_id, input.quantity);
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: { id: result.data as string } };
}

export async function removeItemFromSession(
  itemId: string,
): Promise<ServiceResult<void>> {
  const result = await removeBagItem(itemId);
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: undefined };
}

export async function closeSessionWithDetails(
  input: CloseSessionInput,
): Promise<ServiceResult<void>> {
  if (!input.items.length) return { ok: false, error: { message: 'No items to close' } };

  const result = await repoCloseBag(input.session_id, input.items);
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: undefined };
}

export async function getSessionHistory(
  filters: SessionHistoryFilters = {},
): Promise<ServiceResult<SessionListResponse>> {
  const page = filters.page ?? 1;
  const page_size = filters.page_size ?? PAGE_SIZE;

  const result = await repoListHistory({ ...filters, page, page_size });
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };

  const total = result.count ?? 0;
  return {
    ok: true,
    data: {
      data: (result.data ?? []) as unknown as DigitalBagSession[],
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function searchProducts(
  search?: string,
  limit?: number,
): Promise<ServiceResult<AvailableProduct[]>> {
  const result = await repoSearchProducts(search, limit);
  if (result.error) return { ok: false, error: { message: mapError(result.error.message) } };
  return { ok: true, data: (result.data ?? []) as unknown as AvailableProduct[] };
}

export function getBagCapacity(totalIssued: number): BagCapacityStatus {
  return {
    total_capacity: BAG_CAPACITY,
    items_issued: totalIssued,
    remaining: Math.max(0, BAG_CAPACITY - totalIssued),
    is_full: totalIssued >= BAG_CAPACITY,
  };
}

// ── Backward compat (old hooks, payout module) ───────────────────────────────

export async function getSessions(
  filters: BagSessionFilters = {},
): Promise<ServiceResult<BagSessionListResponse>> {
  const page = filters.page ?? 1;
  const page_size = filters.page_size ?? PAGE_SIZE;

  const result = await listSessions({ ...filters, page, page_size });
  if (result.error) return { ok: false, error: { message: mapError(result.error.message), code: result.error.code } };

  const total = result.count ?? 0;
  return {
    ok: true,
    data: {
      data: (result.data ?? []) as unknown as DigitalBagSessionWithProfiles[],
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function getSessionDetail(id: string): Promise<ServiceResult<DigitalBagSession>> {
  return getSessionById(id);
}

export async function createBagSession(
  input: { technician_id: string },
  issuedBy: string,
): Promise<ServiceResult<DigitalBagSessionWithProfiles>> {
  return createNewSession(input.technician_id, issuedBy) as Promise<ServiceResult<DigitalBagSessionWithProfiles>>;
}

export async function closeBagSession(
  sessionId: string,
  notes?: string,
): Promise<ServiceResult<DigitalBagSessionWithProfiles>> {
  const result = await closeSession(sessionId, notes);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as DigitalBagSessionWithProfiles };
}

// ── Returns ──────────────────────────────────────────────────────────────────

export async function returnItems(
  input: ReturnItemsInput,
): Promise<ServiceResult<DigitalBagItem>> {
  if (input.quantity_returned <= 0) {
    return { ok: false, error: { message: 'Return quantity must be positive' } };
  }
  const result = await returnBagItem(input.bag_item_id, input.quantity_returned);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as DigitalBagItem };
}

// ── Consumptions ─────────────────────────────────────────────────────────────

export async function consumeItem(
  input: ConsumeItemInput,
  technicianId: string,
): Promise<ServiceResult<{ id: string }>> {
  if (input.quantity <= 0) {
    return { ok: false, error: { message: 'Consume quantity must be positive' } };
  }
  const result = await addConsumption({
    bag_item_id: input.bag_item_id,
    subject_id: input.subject_id,
    technician_id: technicianId,
    quantity: input.quantity,
    notes: input.notes,
  });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: { id: result.data.id } };
}

export async function getSubjectConsumptions(subjectId: string) {
  const result = await listConsumptionsBySubject(subjectId);
  if (result.error) {
    return { ok: false as const, error: { message: mapError(result.error.message) } };
  }
  return { ok: true as const, data: result.data ?? [] };
}

// ── Technician bag ───────────────────────────────────────────────────────────

export async function getTechnicianBag(
  technicianId: string,
): Promise<ServiceResult<TechnicianBagSummary[]>> {
  const result = await listTechnicianBagItems(technicianId);
  if (result.error) {
    return { ok: false, error: { message: mapError(result.error.message) } };
  }

  const sessionsMap = new Map<string, { session_id: string; session_date: string; status: string; items: DigitalBagItem[] }>();

  for (const row of (result.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const session = row.session as { id: string; session_date: string; status: string } | null;
    if (!session) continue;
    if (!sessionsMap.has(session.id)) {
      sessionsMap.set(session.id, { session_id: session.id, session_date: session.session_date, status: session.status, items: [] });
    }
    sessionsMap.get(session.id)!.items.push(row as unknown as DigitalBagItem);
  }

  const capResult = await getBagCapacityRemaining(technicianId, BAG_CAPACITY);
  const capacityRemaining = capResult.data ?? BAG_CAPACITY;

  return {
    ok: true,
    data: Array.from(sessionsMap.values()).map((s) => ({
      session_id: s.session_id,
      session_date: s.session_date,
      status: s.status as TechnicianBagSummary['status'],
      items: s.items,
      total_held: s.items.reduce((sum, i) => sum + (i.quantity_issued - i.quantity_returned - i.quantity_consumed), 0),
      capacity_remaining: capacityRemaining,
    })),
  };
}
