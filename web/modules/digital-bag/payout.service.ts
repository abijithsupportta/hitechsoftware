/**
 * @file payout.service.ts
 * @module modules/digital-bag
 *
 * Business logic for technician service payouts.
 *
 * ARCHITECTURE
 * Hook → THIS SERVICE → Repository → Supabase
 */
import type { ServiceResult } from '@/types/common.types';
import {
  listPayouts,
  findPayoutById,
  createPayout,
  updatePayout,
  approvePayout,
  markPayoutPaid,
  listPayoutsByTechnician,
} from '@/repositories/payout.repository';
import type {
  PayoutListResponse,
  PayoutFilters,
  PayoutWithDetails,
  CreatePayoutInput,
  UpdatePayoutInput,
} from './digital-bag.types';

const PAGE_SIZE = 20;

function mapError(message?: string): string {
  return message?.trim() ?? 'Failed to process payout operation';
}

export async function getPayouts(
  filters: PayoutFilters = {},
): Promise<ServiceResult<PayoutListResponse>> {
  const page = filters.page ?? 1;
  const page_size = filters.page_size ?? PAGE_SIZE;

  const result = await listPayouts({ ...filters, page, page_size });
  if (result.error) return { ok: false, error: { message: mapError(result.error.message), code: result.error.code } };

  const total = result.count ?? 0;
  return {
    ok: true,
    data: {
      data: (result.data ?? []) as unknown as PayoutWithDetails[],
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function getPayout(id: string): Promise<ServiceResult<PayoutWithDetails>> {
  const result = await findPayoutById(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message ?? 'Payout not found'), code: result.error?.code } };
  }
  return { ok: true, data: result.data as unknown as PayoutWithDetails };
}

export async function addPayout(input: CreatePayoutInput): Promise<ServiceResult<PayoutWithDetails>> {
  if (!input.technician_id || !input.subject_id) {
    return { ok: false, error: { message: 'Technician and subject are required' } };
  }
  if (input.base_amount < 0) {
    return { ok: false, error: { message: 'Base amount cannot be negative' } };
  }

  const deductions = input.deductions ?? 0;
  const varianceDeduction = input.variance_deduction ?? 0;
  const finalAmount = input.base_amount - deductions - varianceDeduction;

  const result = await createPayout({
    technician_id: input.technician_id,
    subject_id: input.subject_id,
    base_amount: input.base_amount,
    deductions,
    variance_deduction: varianceDeduction,
    final_amount: finalAmount,
    notes: input.notes,
  });

  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as PayoutWithDetails };
}

export async function editPayout(
  id: string,
  input: UpdatePayoutInput,
): Promise<ServiceResult<PayoutWithDetails>> {
  const updateData: Record<string, unknown> = {};

  if (input.status !== undefined) updateData.status = input.status;
  if (input.base_amount !== undefined) updateData.base_amount = input.base_amount;
  if (input.deductions !== undefined) updateData.deductions = input.deductions;
  if (input.variance_deduction !== undefined) updateData.variance_deduction = input.variance_deduction;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // Recalculate final_amount if amount fields changed
  if (input.base_amount !== undefined || input.deductions !== undefined || input.variance_deduction !== undefined) {
    const current = await findPayoutById(id);
    if (current.error || !current.data) {
      return { ok: false, error: { message: 'Payout not found' } };
    }
    const cur = current.data as unknown as Record<string, unknown>;
    const base = input.base_amount ?? cur.base_amount as number;
    const ded = input.deductions ?? cur.deductions as number;
    const varDed = input.variance_deduction ?? cur.variance_deduction as number;
    updateData.final_amount = base - ded - varDed;
  }

  const result = await updatePayout(id, updateData);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as PayoutWithDetails };
}

export async function approvePayoutRecord(
  id: string,
  approvedBy: string,
): Promise<ServiceResult<PayoutWithDetails>> {
  const result = await approvePayout(id, approvedBy);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as PayoutWithDetails };
}

export async function markPayoutAsPaid(id: string): Promise<ServiceResult<PayoutWithDetails>> {
  const result = await markPayoutPaid(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message) } };
  }
  return { ok: true, data: result.data as unknown as PayoutWithDetails };
}

export async function getTechnicianPayouts(technicianId: string): Promise<ServiceResult<PayoutWithDetails[]>> {
  const result = await listPayoutsByTechnician(technicianId);
  if (result.error) {
    return { ok: false, error: { message: mapError(result.error.message) } };
  }
  return { ok: true, data: (result.data ?? []) as unknown as PayoutWithDetails[] };
}
