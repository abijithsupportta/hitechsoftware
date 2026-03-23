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
  notes, closed_at, created_at, updated_at,
  technician:profiles!digital_bag_sessions_technician_id_fkey(id, display_name, email),
  issuer:profiles!digital_bag_sessions_issued_by_fkey(id, display_name)
`.trim();

const SESSION_DETAIL_SELECT = `
  id, technician_id, issued_by, session_date, status,
  total_issued, total_returned, total_consumed, variance,
  notes, closed_at, created_at, updated_at,
  technician:profiles!digital_bag_sessions_technician_id_fkey(id, display_name, email),
  issuer:profiles!digital_bag_sessions_issued_by_fkey(id, display_name),
  items:digital_bag_items(
    id, session_id, product_id, material_code,
    quantity_issued, quantity_returned, quantity_consumed,
    created_at, updated_at,
    product:inventory_products(id, product_name, material_code)
  )
`.trim();

const ITEM_SELECT = `
  id, session_id, product_id, material_code,
  quantity_issued, quantity_returned, quantity_consumed,
  created_at, updated_at,
  product:inventory_products(id, product_name, material_code)
`.trim();

// ── Sessions ─────────────────────────────────────────────────────────────────

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

export async function findSessionById(id: string) {
  return supabase
    .from('digital_bag_sessions')
    .select(SESSION_DETAIL_SELECT)
    .eq('id', id)
    .single();
}

export async function createSession(data: {
  technician_id: string;
  issued_by: string;
  session_date?: string;
  notes?: string;
}) {
  return supabase
    .from('digital_bag_sessions')
    .insert({
      technician_id: data.technician_id,
      issued_by: data.issued_by,
      session_date: data.session_date ?? new Date().toISOString().slice(0, 10),
      notes: data.notes ?? null,
    })
    .select(SESSION_SELECT)
    .single();
}

export async function updateSession(id: string, data: Record<string, unknown>) {
  return supabase
    .from('digital_bag_sessions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SESSION_SELECT)
    .single();
}

export async function closeSession(id: string, notes?: string) {
  return supabase
    .from('digital_bag_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(SESSION_SELECT)
    .single();
}

// ── Items ────────────────────────────────────────────────────────────────────

export async function addSessionItems(
  sessionId: string,
  items: Array<{ product_id: string; material_code: string; quantity_issued: number }>,
) {
  const rows = items.map((item) => ({
    session_id: sessionId,
    product_id: item.product_id,
    material_code: item.material_code,
    quantity_issued: item.quantity_issued,
  }));

  return supabase
    .from('digital_bag_items')
    .insert(rows)
    .select(ITEM_SELECT);
}

export async function updateBagItem(id: string, data: Record<string, unknown>) {
  return supabase
    .from('digital_bag_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ITEM_SELECT)
    .single();
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
    .select(ITEM_SELECT)
    .single();
}

/** List items held by a technician across open sessions. */
export async function listTechnicianBagItems(technicianId: string) {
  return supabase
    .from('digital_bag_items')
    .select(`
      ${ITEM_SELECT},
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
  // Insert consumption record
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

  // Update the bag item's quantity_consumed
  const { data: currentItem, error: fetchErr } = await supabase
    .from('digital_bag_items')
    .select('quantity_consumed')
    .eq('id', data.bag_item_id)
    .single();

  if (fetchErr || !currentItem) return { data: consumption, error: fetchErr };

  await supabase
    .from('digital_bag_items')
    .update({
      quantity_consumed: currentItem.quantity_consumed + data.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.bag_item_id);

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

// ── RPC helpers ──────────────────────────────────────────────────────────────

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
