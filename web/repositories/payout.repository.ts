/**
 * @file payout.repository.ts
 * @module repositories
 *
 * Raw database access for the technician_service_payouts table.
 *
 * ARCHITECTURE
 * Hook → Service → THIS FILE → Supabase
 */
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const PAYOUT_SELECT = `
  id, technician_id, subject_id,
  base_amount, deductions, variance_deduction, final_amount,
  status, notes, approved_by, paid_at, created_at, updated_at,
  technician:profiles!technician_service_payouts_technician_id_fkey(id, display_name, email),
  subject:subjects!technician_service_payouts_subject_id_fkey(id, subject_number),
  approver:profiles!technician_service_payouts_approved_by_fkey(id, display_name)
`.trim();

export interface PayoutRepoFilters {
  technician_id?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listPayouts(filters: PayoutRepoFilters = {}) {
  const { technician_id, status, search, page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('technician_service_payouts')
    .select(PAYOUT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (technician_id) query = query.eq('technician_id', technician_id);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('subject.subject_number', `%${search}%`);

  return query;
}

export async function findPayoutById(id: string) {
  return supabase
    .from('technician_service_payouts')
    .select(PAYOUT_SELECT)
    .eq('id', id)
    .single();
}

export async function createPayout(data: {
  technician_id: string;
  subject_id: string;
  base_amount: number;
  deductions?: number;
  variance_deduction?: number;
  final_amount: number;
  notes?: string;
}) {
  return supabase
    .from('technician_service_payouts')
    .insert({
      technician_id: data.technician_id,
      subject_id: data.subject_id,
      base_amount: data.base_amount,
      deductions: data.deductions ?? 0,
      variance_deduction: data.variance_deduction ?? 0,
      final_amount: data.final_amount,
      notes: data.notes ?? null,
    })
    .select(PAYOUT_SELECT)
    .single();
}

export async function updatePayout(id: string, data: Record<string, unknown>) {
  return supabase
    .from('technician_service_payouts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PAYOUT_SELECT)
    .single();
}

export async function approvePayout(id: string, approvedBy: string) {
  return supabase
    .from('technician_service_payouts')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(PAYOUT_SELECT)
    .single();
}

export async function markPayoutPaid(id: string) {
  return supabase
    .from('technician_service_payouts')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(PAYOUT_SELECT)
    .single();
}

export async function listPayoutsByTechnician(technicianId: string) {
  return supabase
    .from('technician_service_payouts')
    .select(PAYOUT_SELECT)
    .eq('technician_id', technicianId)
    .order('created_at', { ascending: false });
}
