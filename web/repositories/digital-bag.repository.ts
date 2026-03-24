/**
 * @file digital-bag.repository.ts
 * @module repositories
 *
 * Raw database access for digital_bag_sessions, digital_bag_items, and
 * digital_bag_consumptions tables.
 *
 * ARCHITECTURE
 * Hook → Service → THIS FILE → Supabase
 */
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ── SELECT columns ───────────────────────────────────────────────────────────

const SESSION_SELECT = `
  id, technician_id, issued_by, session_date, status,
  total_issued, total_returned, total_consumed, variance,
  total_damage_fees, notes, closed_at, closed_by,
  created_at, updated_at,
  technician:profiles!digital_bag_sessions_technician_id_fkey(id, display_name, email, phone_number),
  issuer:profiles!digital_bag_sessions_issued_by_fkey(id, display_name)
`.trim();

const SESSION_DETAIL_SELECT = `
  id, technician_id, issued_by, session_date, status,
  total_issued, total_returned, total_consumed, variance,
  total_damage_fees, notes, closed_at, closed_by,
  created_at, updated_at,
  technician:profiles!digital_bag_sessions_technician_id_fkey(id, display_name, email, phone_number),
  issuer:profiles!digital_bag_sessions_issued_by_fkey(id, display_name),
  items:digital_bag_items(
    id, session_id, product_id, material_code, product_name, mrp,
    quantity_issued, quantity_returned, quantity_consumed,
    quantity_missing, damage_fee_per_unit, total_damage_fee,
    is_checked, added_by, added_at, created_at, updated_at
  )
`.trim();

// ── Session Queries ──────────────────────────────────────────────────────────

export async function createSession(data: { technician_id: string; issued_by: string }) {
  return supabase
    .from('digital_bag_sessions')
    .insert({
      technician_id: data.technician_id,
      issued_by: data.issued_by,
      session_date: new Date().toISOString().slice(0, 10),
    })
    .select(SESSION_SELECT)
    .single();
}

export async function getTodaySession(technicianId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return supabase
    .from('digital_bag_sessions')
    .select(SESSION_DETAIL_SELECT)
    .eq('technician_id', technicianId)
    .eq('session_date', today)
    .maybeSingle();
}

export async function findSessionById(id: string) {
  return supabase
    .from('digital_bag_sessions')
    .select(SESSION_DETAIL_SELECT)
    .eq('id', id)
    .single();
}

export async function listTodaySessions() {
  const today = new Date().toISOString().slice(0, 10);
  return supabase
    .from('digital_bag_sessions')
    .select(SESSION_DETAIL_SELECT)
    .eq('session_date', today)
    .order('created_at', { ascending: false });
}

export interface SessionFilters {
  technician_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export async function listSessions(filters: SessionFilters = {}) {
  const { technician_id, status, page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('digital_bag_sessions')
    .select(SESSION_SELECT, { count: 'exact' })
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (technician_id) query = query.eq('technician_id', technician_id);
  if (status) query = query.eq('status', status);

  return query;
}

export async function listSessionHistory(filters: {
  technician_id?: string;
  date_from?: string;
  date_to?: string;
  page: number;
  page_size: number;
}) {
  const { technician_id, date_from, date_to, page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('digital_bag_sessions')
    .select(SESSION_SELECT, { count: 'exact' })
    .eq('status', 'closed')
    .order('session_date', { ascending: false })
    .range(from, to);

  if (technician_id) query = query.eq('technician_id', technician_id);
  if (date_from) query = query.gte('session_date', date_from);
  if (date_to) query = query.lte('session_date', date_to);

  return query;
}

export async function closeSession(id: string, notes?: string) {
  const updateData: Record<string, unknown> = {
    status: 'closed',
    closed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) updateData.notes = notes;
  return supabase
    .from('digital_bag_sessions')
    .update(updateData)
    .eq('id', id)
    .select(SESSION_SELECT)
    .single();
}

// ── RPC Functions ────────────────────────────────────────────────────────────

export async function issueBagItem(sessionId: string, productId: string, quantity: number) {
  return supabase.rpc('issue_bag_item', {
    p_session_id: sessionId,
    p_product_id: productId,
    p_quantity: quantity,
  });
}

export async function removeBagItem(itemId: string) {
  return supabase.rpc('remove_bag_item', { p_item_id: itemId });
}

export async function closeBagSession(
  sessionId: string,
  items: Array<{ item_id: string; quantity_returned: number; damage_fee_per_unit?: number }>,
) {
  return supabase.rpc('close_bag_session', {
    p_session_id: sessionId,
    p_items: items,
  });
}

// ── Product Search ───────────────────────────────────────────────────────────

export async function searchAvailableProducts(search?: string, limit = 10) {
  let query = supabase
    .from('current_stock_levels')
    .select('product_id, material_code, product_name, mrp, current_quantity, description')
    .gt('current_quantity', 0)
    .order('material_code');

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`material_code.ilike.%${s}%,product_name.ilike.%${s}%`);
  }

  return query.limit(limit);
}

// ── Items (backward compat) ──────────────────────────────────────────────────

export async function addSessionItems(
  sessionId: string,
  items: Array<{ product_id: string; material_code: string; quantity_issued: number }>,
) {
  return supabase
    .from('digital_bag_items')
    .insert(items.map((item) => ({ session_id: sessionId, ...item })))
    .select('id, session_id, product_id, material_code, quantity_issued');
}

export async function returnBagItem(id: string, quantityReturned: number) {
  const { data: current, error: fetchErr } = await supabase
    .from('digital_bag_items')
    .select('quantity_returned')
    .eq('id', id)
    .single();
  if (fetchErr || !current) return { data: null, error: fetchErr };
  return supabase
    .from('digital_bag_items')
    .update({
      quantity_returned: current.quantity_returned + quantityReturned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .single();
}

export async function listTechnicianBagItems(technicianId: string) {
  return supabase
    .from('digital_bag_items')
    .select(`
      id, session_id, product_id, material_code, product_name, mrp,
      quantity_issued, quantity_returned, quantity_consumed,
      created_at, updated_at,
      session:digital_bag_sessions!inner(id, session_date, status, technician_id)
    `)
    .eq('session.technician_id', technicianId)
    .eq('session.status', 'open');
}

// ── Consumptions ─────────────────────────────────────────────────────────────

export async function addConsumption(data: {
  bag_item_id: string;
  subject_id: string;
  technician_id: string;
  quantity: number;
  notes?: string;
}) {
  const { data: consumption, error: insertErr } = await supabase
    .from('digital_bag_consumptions')
    .insert({
      bag_item_id: data.bag_item_id,
      subject_id: data.subject_id,
      technician_id: data.technician_id,
      quantity: data.quantity,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (insertErr) return { data: null, error: insertErr };

  const { data: currentItem, error: fetchErr } = await supabase
    .from('digital_bag_items')
    .select('quantity_consumed')
    .eq('id', data.bag_item_id)
    .single();
  if (fetchErr || !currentItem) return { data: consumption, error: fetchErr };

  const { error: updateErr } = await supabase
    .from('digital_bag_items')
    .update({
      quantity_consumed: currentItem.quantity_consumed + data.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.bag_item_id);
  if (updateErr) return { data: consumption, error: updateErr };

  return { data: consumption, error: null };
}

export async function listConsumptionsBySubject(subjectId: string) {
  return supabase
    .from('digital_bag_consumptions')
    .select(`
      id, bag_item_id, subject_id, technician_id, quantity, notes, consumed_at,
      bag_item:digital_bag_items(
        id, product_id, material_code,
        product:inventory_products(id, product_name, material_code)
      )
    `)
    .eq('subject_id', subjectId)
    .order('consumed_at', { ascending: false });
}

// ── RPC helpers (backward compat) ────────────────────────────────────────────

export async function getBagCapacityRemaining(technicianId: string, maxCapacity = 50) {
  return supabase.rpc('get_bag_capacity_remaining', {
    p_technician_id: technicianId,
    p_max_capacity: maxCapacity,
  });
}

export async function getSessionVariance(sessionId: string) {
  return supabase.rpc('calculate_session_variance', {
    p_session_id: sessionId,
  });
}
