/**
 * @file commission.repository.ts
 * @module repositories
 *
 * Raw database access for technician commission and earnings tables.
 *
 * ARCHITECTURE
 * Hook → Service → THIS FILE → Supabase
 */
import { createClient } from '@/lib/supabase/client';
import type {
  TechnicianCommissionConfig,
  TechnicianEarningsSummary,
  LeaderboardEntry,
  EarningsFilters,
  CommissionSummary,
  MonthlyEarningsData,
} from '@/modules/commission/commission.types';

const supabase = createClient();

const EARNINGS_SELECT = `
  id, technician_id, subject_id,
  service_commission, parts_commission, extra_price_commission,
  extra_price_collected, variance_deduction, net_earnings,
  total_bill_value, parts_sold_value,
  earnings_status, confirmed_by, confirmed_at,
  created_at, updated_at,
  subject:subjects!technician_earnings_summary_subject_id_fkey(
    id, ticket_number, category_name, created_at
  ),
  technician:profiles!technician_earnings_summary_technician_id_fkey(
    id, full_name, display_name
  )
`.trim();

const COMMISSION_SELECT = `
  id, technician_id, subject_id,
  service_commission, parts_commission, extra_price_commission,
  commission_notes, set_by, set_at, updated_at
`.trim();

export async function upsertCommissionConfig(
  input: {
    technician_id: string;
    subject_id: string;
    service_commission: number;
    parts_commission: number;
    extra_price_commission: number;
    commission_notes?: string;
    set_by: string;
  }
) {
  const { data, error } = await supabase
    .from('technician_commission_config')
    .upsert(
      {
        technician_id: input.technician_id,
        subject_id: input.subject_id,
        service_commission: input.service_commission,
        parts_commission: input.parts_commission,
        extra_price_commission: input.extra_price_commission,
        commission_notes: input.commission_notes || null,
        set_by: input.set_by,
        set_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'technician_id,subject_id' }
    )
    .select(COMMISSION_SELECT)
    .single();

  if (error) throw new Error(`Failed to upsert commission config: ${error.message}`);
  return data as unknown as TechnicianCommissionConfig;
}

export async function getCommissionBySubject(subjectId: string) {
  const { data, error } = await supabase
    .from('technician_commission_config')
    .select(COMMISSION_SELECT)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get commission config: ${error.message}`);
  return data as unknown as TechnicianCommissionConfig | null;
}

export async function getEarningsBySubject(subjectId: string) {
  const { data, error } = await supabase
    .from('technician_earnings_summary')
    .select(EARNINGS_SELECT)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get earnings: ${error.message}`);
  return data as unknown as TechnicianEarningsSummary | null;
}

export async function getEarningsByTechnician(filters: EarningsFilters) {
  const {
    technician_id,
    month,
    year,
    status,
    page = 1,
    page_size = 20,
  } = filters;

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('technician_earnings_summary')
    .select(EARNINGS_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (technician_id) query = query.eq('technician_id', technician_id);
  if (status) query = query.eq('earnings_status', status);

  if (month && year) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endMonth = parseInt(month, 10) + 1;
    const endYear = endMonth > 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
    const endMonthStr = endMonth > 12 ? '01' : String(endMonth).padStart(2, '0');
    const endDate = `${endYear}-${endMonthStr}-01`;
    query = query.gte('created_at', startDate).lt('created_at', endDate);
  } else if (year) {
    query = query.gte('created_at', `${year}-01-01`).lt('created_at', `${parseInt(year, 10) + 1}-01-01`);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to get technician earnings: ${error.message}`);
  return { items: (data ?? []) as unknown as TechnicianEarningsSummary[], total: count ?? 0 };
}

export async function getEarningsSummary(
  technicianId: string,
  month?: string,
  year?: string
): Promise<CommissionSummary> {
  let query = supabase
    .from('technician_earnings_summary')
    .select('service_commission, parts_commission, extra_price_commission, extra_price_collected, variance_deduction, net_earnings, total_bill_value, parts_sold_value, earnings_status')
    .eq('technician_id', technicianId);

  if (month && year) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endMonth = parseInt(month, 10) + 1;
    const endYear = endMonth > 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
    const endMonthStr = endMonth > 12 ? '01' : String(endMonth).padStart(2, '0');
    const endDate = `${endYear}-${endMonthStr}-01`;
    query = query.gte('created_at', startDate).lt('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get earnings summary: ${error.message}`);

  const items = data ?? [];
  return {
    total_services: items.length,
    total_bill_generated: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.total_bill_value || 0), 0),
    total_parts_sold: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.parts_sold_value || 0), 0),
    total_extra_collected: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.extra_price_collected || 0), 0),
    total_service_commission: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.service_commission || 0), 0),
    total_parts_commission: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.parts_commission || 0), 0),
    total_extra_commission: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.extra_price_commission || 0), 0),
    total_variance_deduction: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.variance_deduction || 0), 0),
    total_net_earnings: items.reduce((sum: number, r: Record<string, number | string>) => sum + Number(r.net_earnings || 0), 0),
    pending_count: items.filter((r: Record<string, number | string>) => r.earnings_status === 'pending').length,
  };
}

export async function getLeaderboard(period: string) {
  const { data, error } = await supabase
    .from('technician_leaderboard')
    .select('*')
    .order('total_earnings', { ascending: false });

  if (error) throw new Error(`Failed to get leaderboard: ${error.message}`);

  const ranked = (data ?? []).map((entry: Record<string, unknown>, index: number) => ({
    ...entry,
    rank: index + 1,
    period_type: period, // Add period_type for compatibility
    period_label: period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month',
    services_completed: entry.total_services || 0,
    total_bill_generated: (entry.total_revenue || 0) as number,
    parts_sold_value: (entry.parts_revenue || 0) as number,
    extra_collected: (entry.extra_price_collected || 0) as number,
    service_commission: 0, // These need to be calculated from earnings_summary
    parts_commission: 0,
    extra_commission: 0,
    variance_deduction: 0,
    net_earnings: (entry.total_earnings || 0) as number,
  }));

  return ranked as LeaderboardEntry[];
}

export async function syncEarningsForSubject(subjectId: string) {
  const { error } = await supabase.rpc('sync_technician_earnings', {
    subject_uuid: subjectId,
  });

  if (error) throw new Error(`Failed to sync earnings: ${error.message}`);
}

export async function confirmEarnings(subjectId: string, userId: string) {
  const { data, error } = await supabase
    .from('technician_earnings_summary')
    .update({
      earnings_status: 'confirmed',
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('subject_id', subjectId)
    .eq('earnings_status', 'pending')
    .select(EARNINGS_SELECT)
    .single();

  if (error) throw new Error(`Failed to confirm earnings: ${error.message}`);
  return data as unknown as TechnicianEarningsSummary;
}

export async function confirmAllEarnings(technicianId: string, userId: string, month?: string, year?: string) {
  let query = supabase
    .from('technician_earnings_summary')
    .update({
      earnings_status: 'confirmed',
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('technician_id', technicianId)
    .eq('earnings_status', 'pending');

  if (month && year) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endMonth = parseInt(month, 10) + 1;
    const endYear = endMonth > 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
    const endMonthStr = endMonth > 12 ? '01' : String(endMonth).padStart(2, '0');
    const endDate = `${endYear}-${endMonthStr}-01`;
    query = query.gte('created_at', startDate).lt('created_at', endDate);
  }

  const { data, error } = await query.select('id');

  if (error) throw new Error(`Failed to confirm all earnings: ${error.message}`);
  return { confirmed_count: (data ?? []).length };
}

export async function getMonthlyEarningsChart(technicianId: string, months: number = 6): Promise<MonthlyEarningsData[]> {
  const results: MonthlyEarningsData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month + 1;
    const endYear = endMonth > 12 ? year + 1 : year;
    const endMonthStr = endMonth > 12 ? '01' : String(endMonth).padStart(2, '0');
    const endDate = `${endYear}-${endMonthStr}-01`;

    const { data, error } = await supabase
      .from('technician_earnings_summary')
      .select('net_earnings')
      .eq('technician_id', technicianId)
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (error) throw new Error(`Failed to get monthly chart data: ${error.message}`);

    const items = data ?? [];
    const monthLabel = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

    results.push({
      month: monthLabel,
      net_earnings: items.reduce((sum: number, r: Record<string, number>) => sum + Number(r.net_earnings || 0), 0),
      services_completed: items.length,
    });
  }

  return results;
}
