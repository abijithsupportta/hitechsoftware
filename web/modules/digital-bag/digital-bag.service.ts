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
  createSession,
  closeSession,
  addSessionItems,
  returnBagItem,
  addConsumption,
  listTechnicianBagItems,
  listConsumptionsBySubject,
  getBagCapacityRemaining,
} from '@/repositories/digital-bag.repository';
import type {
  BagSessionListResponse,
  BagSessionFilters,
  DigitalBagSessionWithProfiles,
  DigitalBagSessionDetail,
  CreateSessionInput,
  ReturnItemsInput,
  ConsumeItemInput,
  TechnicianBagSummary,
  DigitalBagItem,
} from './digital-bag.types';
import { BAG_CAPACITY } from './digital-bag.constants';

const PAGE_SIZE = 20;

function mapError(message?: string): string {
  return message?.trim() ?? 'Failed to process digital bag operation';
}

// ── Sessions ─────────────────────────────────────────────────────────────────

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

export async function getSessionDetail(id: string): Promise<ServiceResult<DigitalBagSessionDetail>> {
  const result = await findSessionById(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message ?? 'Session not found'), code: result.error?.code } };
  }
  return { ok: true, data: result.data as unknown as DigitalBagSessionDetail };
}

export async function createBagSession(
  input: CreateSessionInput,
  issuedBy: string,
): Promise<ServiceResult<DigitalBagSessionWithProfiles>> {
  if (!input.technician_id) {
    return { ok: false, error: { message: 'Technician is required' } };
  }
  if (!input.items.length) {
    return { ok: false, error: { message: 'At least one item is required' } };
  }

  // Check capacity
  const capResult = await getBagCapacityRemaining(input.technician_id, BAG_CAPACITY);
  if (capResult.error) {
    return { ok: false, error: { message: mapError(capResult.error.message) } };
  }

  const totalRequested = input.items.reduce((sum, i) => sum + i.quantity_issued, 0);
  const remaining = capResult.data ?? BAG_CAPACITY;
  if (totalRequested > remaining) {
    return {
      ok: false,
      error: { message: `Exceeds bag capacity. Remaining: ${remaining}, Requested: ${totalRequested}` },
    };
  }

  // Create session
  const sessionResult = await createSession({
    technician_id: input.technician_id,
    issued_by: issuedBy,
    session_date: input.session_date,
    notes: input.notes,
  });

  if (sessionResult.error || !sessionResult.data) {
    return { ok: false, error: { message: mapError(sessionResult.error?.message) } };
  }

  const sessionData = sessionResult.data as unknown as Record<string, unknown>;

  // Add items
  const itemsResult = await addSessionItems(sessionData.id as string, input.items);
  if (itemsResult.error) {
    return { ok: false, error: { message: mapError(itemsResult.error.message) } };
  }

  return { ok: true, data: sessionData as unknown as DigitalBagSessionWithProfiles };
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

  // Group items by session
  const sessionsMap = new Map<string, { session_id: string; session_date: string; status: string; items: DigitalBagItem[] }>();

  for (const row of (result.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const session = row.session as { id: string; session_date: string; status: string } | null;
    if (!session) continue;

    if (!sessionsMap.has(session.id)) {
      sessionsMap.set(session.id, {
        session_id: session.id,
        session_date: session.session_date,
        status: session.status,
        items: [],
      });
    }
    sessionsMap.get(session.id)!.items.push(row as unknown as DigitalBagItem);
  }

  const capResult = await getBagCapacityRemaining(technicianId, BAG_CAPACITY);
  const capacityRemaining = capResult.data ?? BAG_CAPACITY;

  const summaries: TechnicianBagSummary[] = Array.from(sessionsMap.values()).map((s) => {
    const totalHeld = s.items.reduce(
      (sum, i) => sum + (i.quantity_issued - i.quantity_returned - i.quantity_consumed),
      0,
    );
    return {
      session_id: s.session_id,
      session_date: s.session_date,
      status: s.status as TechnicianBagSummary['status'],
      items: s.items,
      total_held: totalHeld,
      capacity_remaining: capacityRemaining,
    };
  });

  return { ok: true, data: summaries };
}
