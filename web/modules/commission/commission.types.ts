// ─────────────────────────────────────────────────────────────────────────────
// commission.types.ts
//
// TypeScript interfaces for the Technician Commission and Performance system.
// Maps directly to the database tables created in migration 030.
// ─────────────────────────────────────────────────────────────────────────────

export interface TechnicianCommissionConfig {
  id: string;
  technician_id: string;
  subject_id: string;
  service_commission: number;
  parts_commission: number;
  extra_price_commission: number;
  commission_notes: string | null;
  set_by: string | null;
  set_at: string;
  updated_at: string;
}

export interface TechnicianEarningsSummary {
  id: string;
  technician_id: string;
  subject_id: string;
  service_commission: number;
  parts_commission: number;
  extra_price_commission: number;
  extra_price_collected: number;
  variance_deduction: number;
  net_earnings: number;
  total_bill_value: number;
  parts_sold_value: number;
  earnings_status: 'pending' | 'confirmed';
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  technician_name?: string;
  subject_number?: string;
  service_category?: string;
  subject_date?: string;
}

export interface LeaderboardEntry {
  technician_id: string;
  technician_name: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_label: string;
  services_completed: number;
  total_bill_generated: number;
  parts_sold_value: number;
  extra_collected: number;
  service_commission: number;
  parts_commission: number;
  extra_commission: number;
  variance_deduction: number;
  net_earnings: number;
  // AMC metrics
  amc_sold_count: number;
  amc_revenue: number;
  amc_commission: number;
  rank?: number;
}

export interface SetCommissionInput {
  technician_id: string;
  subject_id: string;
  service_commission: number;
  parts_commission: number;
  extra_price_commission: number;
  commission_notes?: string;
}

export interface CommissionSummary {
  total_services: number;
  total_bill_generated: number;
  total_parts_sold: number;
  total_extra_collected: number;
  total_service_commission: number;
  total_parts_commission: number;
  total_extra_commission: number;
  total_variance_deduction: number;
  total_net_earnings: number;
  pending_count: number;
}

export interface EarningsFilters {
  technician_id?: string;
  month?: string;
  year?: string;
  status?: 'pending' | 'confirmed';
  page?: number;
  page_size?: number;
}

export interface EarningsListResponse {
  items: TechnicianEarningsSummary[];
  total: number;
  summary: CommissionSummary;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface MonthlyEarningsData {
  month: string;
  net_earnings: number;
  services_completed: number;
}
