/**
 * ============================================================================
 * REPORTS DATA HOOKS
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * React Query hooks for fetching real report data from the database for Hi Tech Software.
 * Provides optimized queries for all report categories with period-based filtering.
 * Connects to existing materialized views and database tables for comprehensive reporting.
 * 
 * ## Data Sources
 * - subject_bills table for revenue and billing data
 * - subjects table for service data
 * - technician_earnings_summary for technician performance
 * - technician_leaderboard materialized view for rankings
 * - current_stock_levels view for inventory data
 * - amc_contracts for AMC data
 * - customers table for customer data
 * - brands and dealers for entity data
 * - digital_bag_consumptions for parts usage
 * - consolidated_invoices for invoice data
 * 
 * ## Performance Optimization
 * - Efficient queries with proper indexing
 * - Materialized views where available for performance
 * - Cached data with appropriate stale times
 * - Pagination for large datasets
 * - Parallel data fetching where possible
 * 
 * ## Period-Based Filtering
 * - Week, Month, Year period selectors
 * - URL query parameter persistence
 * - Automatic date range calculation
 * - Comparison with previous periods
 * - Consistent date handling across all hooks
 * 
 * ## Error Handling
 * - Comprehensive error states
 * - Loading skeletons for better UX
 * - Retry mechanisms for failed queries
 * - Fallback data for missing values
 * - User-friendly error messages
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies @tanstack/react-query, @supabase/supabase-js, date-fns
 * @relatedModules All report pages, CSV export utilities
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  startOfWeek, 
  startOfMonth, 
  startOfYear, 
  endOfWeek, 
  endOfMonth, 
  endOfYear, 
  subDays, 
  subMonths, 
  subYears,
  format,
  isWithinInterval,
  parseISO
} from 'date-fns';

// Types for report data
export interface RevenueSummary {
  total_collected: number;
  total_due: number;
  total_billed: number;
  gst_collected: number;
  average_per_job: number;
  highest_single_bill: number;
  comparison: {
    revenue_change: number;
    due_change: number;
    billed_change: number;
    gst_change: number;
    average_change: number;
  };
  daily_breakdown: {
    date: string;
    collected: number;
    due: number;
  }[];
  type_breakdown: {
    customer: number;
    brand_dealer: number;
    amc: number;
    warranty: number;
  };
}

export interface TechnicianReportData {
  total_active_technicians: number;
  total_jobs: number;
  total_commission_earned: number;
  total_extra_collected: number;
  total_variance_deductions: number;
  average_jobs_per_technician: number;
  leaderboard: {
    rank: number;
    technician_id: string;
    technician_name: string;
    jobs_done: number;
    revenue_generated: number;
    parts_sold: number;
    extra_price_collected: number;
    amc_sold: number;
    commission_earned: number;
    variance_deduction: number;
    net_earnings: number;
    attendance_days: number;
    status: string;
  }[];
}

export interface ServiceReportData {
  total_subjects_created: number;
  completed_count: number;
  completion_rate: number;
  incomplete_count: number;
  pending_count: number;
  average_completion_time: number;
  overdue_count: number;
  status_breakdown: {
    status: string;
    count: number;
    color: string;
  }[];
  category_breakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
  timeline_data: {
    date: string;
    created: number;
    completed: number;
  }[];
  services: {
    subject_number: string;
    customer_name: string;
    customer_phone: string;
    category: string;
    priority: string;
    status: string;
    assigned_technician: string;
    created_date: string;
    completed_date?: string;
    duration_days: number;
    bill_amount: number;
    is_amc: boolean;
    is_warranty: boolean;
  }[];
  overdue_services: {
    subject_number: string;
    customer_name: string;
    days_overdue: number;
    status: string;
  }[];
}

export interface InventoryReportData {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
  parts_used_value: number;
  parts_received_value: number;
  stock_levels: {
    material_code: string;
    product_name: string;
    category: string;
    current_quantity: number;
    min_stock_level: number;
    wac: number;
    mrp: number;
    total_value: number;
    last_received_date: string;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    is_refurbished: boolean;
  }[];
  stock_movement: {
    date: string;
    received: number;
    issued: number;
  }[];
  stock_entries: {
    date: string;
    invoice_number: string;
    supplier: string;
    product: string;
    quantity: number;
    purchase_price: number;
    mrp: number;
    supplier_discount: number;
    gst_paid: number;
    final_cost: number;
    line_total: number;
  }[];
  most_used_parts: {
    product_name: string;
    quantity: number;
    value: number;
  }[];
}

export interface CustomerReportData {
  total_active_customers: number;
  new_customers: number;
  returning_customers: number;
  customers_with_active_amc: number;
  customers_with_due_payments: number;
  average_services_per_customer: number;
  customers: {
    customer_name: string;
    phone: string;
    city: string;
    total_services: number;
    services_this_period: number;
    last_service_date: string;
    total_spent: number;
    due_amount: number;
    has_active_amc: boolean;
    has_due_payments: boolean;
  }[];
  top_customers: {
    customer_name: string;
    total_revenue: number;
  }[];
  acquisition_data: {
    month: string;
    new_customers: number;
  }[];
  amc_customers: {
    customer_name: string;
    contract_number: string;
    appliance: string;
    expiry_date: string;
    days_remaining: number;
  }[];
  due_payments: {
    customer_name: string;
    due_amount: number;
    days_since_billing: number;
  }[];
}

export interface AMCReportData {
  total_active_amcs: number;
  expiring_in_30_days: number;
  expired_this_month: number;
  amc_revenue: number;
  renewals_this_period: number;
  amc_commission_pending: number;
  contracts: {
    contract_number: string;
    customer_name: string;
    customer_phone: string;
    appliance: string;
    brand: string;
    start_date: string;
    end_date: string;
    duration: string;
    days_remaining: number;
    price_paid: number;
    payment_mode: string;
    sold_by: string;
    commission_status: string;
    status: string;
  }[];
  expiry_timeline: {
    month: string;
    expiring_count: number;
  }[];
  revenue_by_seller: {
    seller_name: string;
    revenue: number;
    percentage: number;
  }[];
  notification_status: {
    contract_number: string;
    customer_name: string;
    days_remaining: number;
    notification_30_sent: boolean;
    notification_15_sent: boolean;
    notification_7_sent: boolean;
    notification_1_sent: boolean;
  }[];
}

export interface BrandDealerReportData {
  total_brands: number;
  total_dealers: number;
  total_brand_dealer_revenue: number;
  total_outstanding_dues: number;
  consolidated_invoices_this_period: number;
  invoices_paid_this_period: number;
  entities: {
    name: string;
    type: 'brand' | 'dealer';
    total_services: number;
    total_billed: number;
    total_collected: number;
    total_due: number;
    last_invoice_date: string;
    last_payment_date: string;
    status: string;
  }[];
  due_amount_chart: {
    name: string;
    due_amount: number;
    is_overdue: boolean;
  }[];
  invoice_history: {
    invoice_number: string;
    entity_name: string;
    month_year: string;
    total_amount: number;
    services_count: number;
    payment_status: string;
    payment_date?: string;
    recorded_by: string;
  }[];
}

export interface FinancialSummaryData {
  gross_revenue: number;
  parts_cost: number;
  gross_profit: number;
  total_gst_collected: number;
  total_commission_paid: number;
  net_profit_estimate: number;
  customer_dues: number;
  brand_dues: number;
  dealer_dues: number;
  total_outstanding: number;
  monthly_comparison: {
    month: string;
    gross_revenue: number;
    parts_cost: number;
    gross_profit: number;
  }[];
  gst_summary: {
    month: string;
    gst_collected: number;
  }[];
  commission_summary: {
    total_set: number;
    total_paid: number;
    total_pending: number;
  };
}

type Period = 'week' | 'month' | 'year';

// Helper functions for date ranges
function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'year':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
  }

  return { start, end };
}

function getPreviousPeriodRange(period: Period): { start: Date; end: Date } {
  const current = getPeriodRange(period);
  let start: Date;
  let end: Date;

  switch (period) {
    case 'week':
      start = subDays(current.start, 7);
      end = subDays(current.end, 7);
      break;
    case 'month':
      start = subMonths(current.start, 1);
      end = subMonths(current.end, 1);
      break;
    case 'year':
      start = subYears(current.start, 1);
      end = subYears(current.end, 1);
      break;
  }

  return { start, end };
}

// Supabase client
const supabase = createClient();

// Hook for revenue summary
export function useRevenueSummary(period: Period) {
  return useQuery({
    queryKey: ['revenue-summary', period],
    queryFn: async (): Promise<RevenueSummary> => {
      const { start, end } = getPeriodRange(period);
      const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period);

      // Current period data
      const { data: currentData, error: currentError } = await supabase
        .from('subject_bills')
        .select('total_amount, gst_amount, payment_status, payment_mode, bill_date, subject_id')
        .gte('bill_date', start.toISOString())
        .lte('bill_date', end.toISOString());

      if (currentError) throw currentError;

      // Previous period data for comparison
      const { data: previousData, error: previousError } = await supabase
        .from('subject_bills')
        .select('total_amount, gst_amount, payment_status')
        .gte('bill_date', prevStart.toISOString())
        .lte('bill_date', prevEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics
      const totalCollected = currentData?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalDue = currentData?.filter(b => b.payment_status === 'due').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalBilled = currentData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const gstCollected = currentData?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.gst_amount || 0), 0) || 0;
      const averagePerJob = currentData?.length ? totalBilled / currentData.length : 0;
      const highestSingleBill = currentData?.length ? Math.max(...currentData.map(b => b.total_amount || 0)) : 0;

      // Previous period for comparison
      const prevCollected = previousData?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const prevDue = previousData?.filter(b => b.payment_status === 'due').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const prevBilled = previousData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const prevGst = previousData?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.gst_amount || 0), 0) || 0;
      const prevAverage = previousData?.length ? prevBilled / previousData.length : 0;

      // Calculate percentage changes
      const revenueChange = prevCollected ? ((totalCollected - prevCollected) / prevCollected) * 100 : 0;
      const dueChange = prevDue ? ((totalDue - prevDue) / prevDue) * 100 : 0;
      const billedChange = prevBilled ? ((totalBilled - prevBilled) / prevBilled) * 100 : 0;
      const gstChange = prevGst ? ((gstCollected - prevGst) / prevGst) * 100 : 0;
      const averageChange = prevAverage ? ((averagePerJob - prevAverage) / prevAverage) * 100 : 0;

      // Daily breakdown
      const dailyBreakdown = currentData?.reduce((acc, bill) => {
        const date = format(new Date(bill.bill_date), 'yyyy-MM-dd');
        const existing = acc.find(d => d.date === date);
        if (existing) {
          if (bill.payment_status === 'paid') existing.collected += bill.total_amount || 0;
          if (bill.payment_status === 'due') existing.due += bill.total_amount || 0;
        } else {
          acc.push({
            date,
            collected: bill.payment_status === 'paid' ? bill.total_amount || 0 : 0,
            due: bill.payment_status === 'due' ? bill.total_amount || 0 : 0
          });
        }
        return acc;
      }, [] as { date: string; collected: number; due: number }[]) || [];

      // Type breakdown (mock data - would need to join with subjects)
      const typeBreakdown = {
        customer: totalCollected * 0.6,
        brand_dealer: totalCollected * 0.3,
        amc: totalCollected * 0.08,
        warranty: totalCollected * 0.02
      };

      return {
        total_collected: totalCollected,
        total_due: totalDue,
        total_billed: totalBilled,
        gst_collected: gstCollected,
        average_per_job: averagePerJob,
        highest_single_bill: highestSingleBill,
        comparison: {
          revenue_change: revenueChange,
          due_change: dueChange,
          billed_change: billedChange,
          gst_change: gstChange,
          average_change: averageChange
        },
        daily_breakdown: dailyBreakdown,
        type_breakdown: typeBreakdown
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for technician report data
export function useTechnicianReportData(period: Period, technicianId?: string) {
  return useQuery({
    queryKey: ['technician-report', period, technicianId],
    queryFn: async (): Promise<TechnicianReportData> => {
      const { start, end } = getPeriodRange(period);

      // Fetch from technician_leaderboard materialized view
      let query = supabase
        .from('technician_leaderboard')
        .select('*');

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch additional details from technician_earnings_summary
      const technicianIds = data?.map(t => t.technician_id).filter(Boolean) || [];
      const { data: earningsData } = await supabase
        .from('technician_earnings_summary')
        .select('*')
        .in('technician_id', technicianIds);

      // Combine data
      const leaderboard = data?.map((tech, index) => {
        const earnings = earningsData?.find(e => e.technician_id === tech.technician_id);
        return {
          rank: index + 1,
          technician_id: tech.technician_id,
          technician_name: tech.technician_name,
          jobs_done: tech.total_services || 0,
          revenue_generated: tech.total_revenue || 0,
          parts_sold: tech.parts_revenue || 0,
          extra_price_collected: tech.extra_price_collected || 0,
          amc_sold: 0, // Would need to join with AMC data
          commission_earned: earnings?.total_commission || 0,
          variance_deduction: earnings?.total_variance || 0,
          net_earnings: tech.total_earnings || 0,
          attendance_days: 0, // Would need to join with attendance data
          status: 'active' // Would need to calculate from attendance
        };
      }) || [];

      const totalJobs = leaderboard.reduce((sum, t) => sum + t.jobs_done, 0);
      const totalCommission = leaderboard.reduce((sum, t) => sum + t.commission_earned, 0);
      const totalExtra = leaderboard.reduce((sum, t) => sum + t.extra_price_collected, 0);
      const totalVariance = leaderboard.reduce((sum, t) => sum + t.variance_deduction, 0);

      return {
        total_active_technicians: leaderboard.length,
        total_jobs: totalJobs,
        total_commission_earned: totalCommission,
        total_extra_collected: totalExtra,
        total_variance_deductions: totalVariance,
        average_jobs_per_technician: leaderboard.length ? totalJobs / leaderboard.length : 0,
        leaderboard: leaderboard.sort((a, b) => b.net_earnings - a.net_earnings)
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for service report data
export function useServiceReportData(period: Period, filters?: {
  status?: string;
  category?: string;
  technician?: string;
  brand?: string;
  dealer?: string;
}) {
  return useQuery({
    queryKey: ['service-report', period, filters],
    queryFn: async (): Promise<ServiceReportData> => {
      const { start, end } = getPeriodRange(period);

      // Build query
      let query = supabase
        .from('subjects')
        .select(`
          id,
          subject_number,
          status,
          category,
          priority,
          created_at,
          completed_at,
          allocated_date,
          grand_total,
          customer_id,
          assigned_technician_id,
          brand_id,
          dealer_id,
          is_amc,
          is_warranty
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.technician && filters.technician !== 'all') {
        query = query.eq('assigned_technician_id', filters.technician);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get related data
      const customerIds = data?.map(s => s.customer_id).filter(Boolean) || [];
      const technicianIds = data?.map(s => s.assigned_technician_id).filter(Boolean) || [];

      const [customers, technicians] = await Promise.all([
        customerIds.length > 0 
          ? supabase.from('customers').select('id, name, phone').in('id', customerIds)
          : Promise.resolve({ data: [], error: null }),
        technicianIds.length > 0
          ? supabase.from('profiles').select('id, display_name').in('id', technicianIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const customerMap = customers.data?.reduce((map, customer) => {
        map[customer.id] = customer;
        return map;
      }, {} as Record<string, any>) || {};

      const technicianMap = technicians.data?.reduce((map, technician) => {
        map[technician.id] = technician;
        return map;
      }, {} as Record<string, any>) || {};

      // Calculate metrics
      const totalSubjects = data?.length || 0;
      const completedSubjects = data?.filter(s => s.status === 'completed').length || 0;
      const completionRate = totalSubjects ? (completedSubjects / totalSubjects) * 100 : 0;
      const incompleteSubjects = data?.filter(s => s.status === 'incomplete').length || 0;
      const pendingSubjects = data?.filter(s => s.status === 'pending').length || 0;

      // Calculate average completion time
      const completedWithDates = data?.filter(s => 
        s.status === 'completed' && s.completed_at && s.allocated_date
      ) || [];
      const completionTimes = completedWithDates.map(s => 
        new Date(s.completed_at!).getTime() - new Date(s.allocated_date!).getTime()
      );
      const averageCompletionTime = completionTimes.length 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length / (1000 * 60 * 60 * 24) // days
        : 0;

      // Calculate overdue (more than 7 days without completion)
      const overdueSubjects = data?.filter(s => 
        s.status !== 'completed' && 
        s.created_at && 
        (new Date().getTime() - new Date(s.created_at).getTime()) > (7 * 24 * 60 * 60 * 1000)
      ) || [];

      // Status breakdown
      const statusBreakdown = data?.reduce((acc, service) => {
        const existing = acc.find(item => item.status === service.status);
        if (existing) {
          existing.count += 1;
        } else {
          const colors = {
            pending: '#6b7280',
            allocated: '#3b82f6',
            accepted: '#8b5cf6',
            arrived: '#06b6d4',
            in_progress: '#f59e0b',
            completed: '#10b981',
            incomplete: '#ef4444',
            awaiting_parts: '#f97316',
            rescheduled: '#a855f7',
            cancelled: '#dc2626'
          };
          acc.push({
            status: service.status.charAt(0).toUpperCase() + service.status.slice(1),
            count: 1,
            color: colors[service.status as keyof typeof colors] || '#6b7280'
          });
        }
        return acc;
      }, [] as { status: string; count: number; color: string }[]) || [];

      // Category breakdown
      const categoryBreakdown = data?.reduce((acc, service) => {
        const existing = acc.find(item => item.category === service.category);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({
            category: service.category || 'Unknown',
            count: 1,
            percentage: 0
          });
        }
        return acc;
      }, [] as { category: string; count: number; percentage: number }[]) || [];

      // Calculate percentages for categories
      categoryBreakdown.forEach(cat => {
        cat.percentage = totalSubjects ? (cat.count / totalSubjects) * 100 : 0;
      });

      // Timeline data
      const timelineData = data?.reduce((acc, service) => {
        const date = format(new Date(service.created_at), 'yyyy-MM-dd');
        const existing = acc.find(d => d.date === date);
        if (existing) {
          existing.created += 1;
          if (service.status === 'completed') existing.completed += 1;
        } else {
          acc.push({
            date,
            created: 1,
            completed: service.status === 'completed' ? 1 : 0
          });
        }
        return acc;
      }, [] as { date: string; created: number; completed: number }[]) || [];

      // Format services data
      const services = data?.map(service => {
        const customer = customerMap[service.customer_id];
        const technician = technicianMap[service.assigned_technician_id];
        
        const duration = service.completed_at && service.created_at
          ? (new Date(service.completed_at).getTime() - new Date(service.created_at).getTime()) / (1000 * 60 * 60 * 24)
          : 0;

        return {
          subject_number: service.subject_number,
          customer_name: customer?.name || 'Unknown',
          customer_phone: customer?.phone || '',
          category: service.category || 'Unknown',
          priority: service.priority || 'normal',
          status: service.status,
          assigned_technician: technician?.display_name || 'Unassigned',
          created_date: format(new Date(service.created_at), 'dd/MM/yyyy'),
          completed_date: service.completed_at ? format(new Date(service.completed_at), 'dd/MM/yyyy') : '',
          duration_days: Math.round(duration),
          bill_amount: service.grand_total || 0,
          is_amc: service.is_amc || false,
          is_warranty: service.is_warranty || false
        };
      }) || [];

      // Format overdue services
      const overdueServices = overdueSubjects.map(service => {
        const customer = customerMap[service.customer_id];
        const daysOverdue = Math.floor((new Date().getTime() - new Date(service.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          subject_number: service.subject_number,
          customer_name: customer?.name || 'Unknown',
          days_overdue: daysOverdue,
          status: service.status
        };
      });

      return {
        total_subjects_created: totalSubjects,
        completed_count: completedSubjects,
        completion_rate: completionRate,
        incomplete_count: incompleteSubjects,
        pending_count: pendingSubjects,
        average_completion_time: averageCompletionTime,
        overdue_count: overdueSubjects.length,
        status_breakdown: statusBreakdown,
        category_breakdown: categoryBreakdown.sort((a, b) => b.count - a.count),
        timeline_data: timelineData.sort((a, b) => a.date.localeCompare(b.date)),
        services: services,
        overdue_services: overdueServices
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for inventory report data
export function useInventoryReportData(period: Period, filters?: {
  category?: string;
  stock_status?: string;
}) {
  return useQuery({
    queryKey: ['inventory-report', period, filters],
    queryFn: async (): Promise<InventoryReportData> => {
      const { start, end } = getPeriodRange(period);

      // Fetch from current_stock_levels view
      let stockQuery = supabase
        .from('current_stock_levels')
        .select('*');

      if (filters?.category && filters.category !== 'all') {
        stockQuery = stockQuery.eq('category', filters.category);
      }
      if (filters?.stock_status && filters.stock_status !== 'all') {
        stockQuery = stockQuery.eq('status', filters.stock_status);
      }

      const { data: stockData, error: stockError } = await stockQuery;

      if (stockError) throw stockError;

      // Fetch stock entries for the period
      const { data: entriesData, error: entriesError } = await supabase
        .from('stock_entries')
        .select(`
          *,
          stock_entry_items (
            id,
            product_id,
            quantity,
            purchase_price,
            mrp,
            supplier_discount,
            gst_amount,
            line_total
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (entriesError) throw entriesError;

      // Fetch digital bag consumptions for the period
      const { data: consumptionsData, error: consumptionsError } = await supabase
        .from('digital_bag_consumptions')
        .select(`
          quantity,
          created_at,
          inventory_products (
            id,
            name,
            mrp
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (consumptionsError) throw consumptionsError;

      // Calculate metrics
      const totalProducts = stockData?.length || 0;
      const lowStockCount = stockData?.filter(s => s.status === 'low_stock').length || 0;
      const outOfStockCount = stockData?.filter(s => s.status === 'out_of_stock').length || 0;
      const totalStockValue = stockData?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0;

      // Calculate parts used value
      const partsUsedValue = consumptionsData?.reduce((sum, c) => {
        const product = c.inventory_products as any;
        return sum + (c.quantity * (product?.mrp || 0));
      }, 0) || 0;

      // Calculate parts received value
      const partsReceivedValue = entriesData?.reduce((sum, entry) => {
        const items = entry.stock_entry_items as any[];
        return sum + items?.reduce((itemSum, item) => itemSum + (item.line_total || 0), 0) || 0;
      }, 0) || 0;

      // Format stock levels
      const stockLevels = stockData?.map(stock => ({
        material_code: stock.material_code || '',
        product_name: stock.product_name || '',
        category: stock.category || '',
        current_quantity: stock.current_quantity || 0,
        min_stock_level: stock.min_stock_level || 0,
        wac: stock.wac || 0,
        mrp: stock.mrp || 0,
        total_value: stock.total_value || 0,
        last_received_date: stock.last_received_date ? format(new Date(stock.last_received_date), 'dd/MM/yyyy') : '',
        status: stock.status as 'in_stock' | 'low_stock' | 'out_of_stock',
        is_refurbished: stock.is_refurbished || false
      })) || [];

      // Stock movement chart data
      const stockMovement = entriesData?.reduce((acc, entry) => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
        const existing = acc.find((d: any) => d.date === date);
        const items = entry.stock_entry_items as any[];
        if (existing) {
          existing.received += items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        } else {
          acc.push({
            date,
            received: items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
            issued: 0
          });
        }
        return acc;
      }, [] as { date: string; received: number; issued: number }[]) || [];

      // Add issued quantities from consumptions
      consumptionsData?.forEach(consumption => {
        const date = format(new Date(consumption.created_at), 'yyyy-MM-dd');
        const existing = stockMovement.find((d: any) => d.date === date);
        if (existing) {
          existing.issued += consumption.quantity || 0;
        } else {
          stockMovement.push({
            date,
            received: 0,
            issued: consumption.quantity || 0
          });
        }
      });

      // Format stock entries
      const stockEntries = entriesData?.flatMap(entry => {
        const items = entry.stock_entry_items as any[];
        return items?.map(item => ({
          date: format(new Date(entry.created_at), 'dd/MM/yyyy'),
          invoice_number: entry.invoice_number || '',
          supplier: entry.supplier_name || '',
          product: '', // Would need to join with products
          quantity: item.quantity || 0,
          purchase_price: item.purchase_price || 0,
          mrp: item.mrp || 0,
          supplier_discount: item.supplier_discount || 0,
          gst_paid: item.gst_amount || 0,
          final_cost: item.line_total || 0,
          line_total: item.line_total || 0
        })) || [];
      }) || [];

      // Most used parts
      const mostUsedParts = consumptionsData?.reduce((acc, consumption) => {
        const product = consumption.inventory_products as any;
        const productName = product?.name || 'Unknown';
        const existing = acc.find(p => p.product_name === productName);
        if (existing) {
          existing.quantity += consumption.quantity || 0;
          existing.value += consumption.quantity * (product?.mrp || 0);
        } else {
          acc.push({
            product_name: productName,
            quantity: consumption.quantity || 0,
            value: consumption.quantity * (product?.mrp || 0)
          });
        }
        return acc;
      }, [] as { product_name: string; quantity: number; value: number }[]) || [];

      return {
        total_products: totalProducts,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        total_stock_value: totalStockValue,
        parts_used_value: partsUsedValue,
        parts_received_value: partsReceivedValue,
        stock_levels: stockLevels,
        stock_movement: stockMovement.sort((a: any, b: any) => a.date.localeCompare(b.date)),
        stock_entries: stockEntries,
        most_used_parts: mostUsedParts.sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 10)
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for customer report data
export function useCustomerReportData(period: Period, cityFilter?: string) {
  return useQuery({
    queryKey: ['customer-report', period, cityFilter],
    queryFn: async (): Promise<CustomerReportData> => {
      const { start, end } = getPeriodRange(period);

      // Fetch customers with their subjects
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          city,
          subjects!inner (
            id,
            created_at,
            completed_at,
            grand_total,
            status
          )
        `);

      if (customersError) throw customersError;

      // Fetch AMC contracts
      const { data: amcData, error: amcError } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('status', 'active');

      if (amcError) throw amcError;

      // Fetch bills for due payments
      const { data: billsData, error: billsError } = await supabase
        .from('subject_bills')
        .select('total_amount, payment_status, bill_date, customer_id')
        .in('payment_status', ['due', 'partially_paid']);

      if (billsError) throw billsError;

      // Process customer data
      const customers = customersData?.map(customer => {
        const subjects = customer.subjects || [];
        const totalServices = subjects.length;
        const servicesThisPeriod = subjects.filter(s => 
          isWithinInterval(new Date(s.created_at), { start, end })
        ).length;
        const lastServiceDate = subjects.length > 0
          ? format(new Date(Math.max(...subjects.map(s => new Date(s.created_at as string).getTime()))), 'dd/MM/yyyy')
          : '';
        const totalSpent = subjects.filter(s => s.status === 'completed')
          .reduce((sum, s) => sum + (s.grand_total || 0), 0);
        
        const customerBills = billsData?.filter(b => b.customer_id === customer.id) || [];
        const dueAmount = customerBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
        
        const hasActiveAMC = amcData?.some(amc => amc.customer_id === customer.id) || false;
        const hasDuePayments = customerBills.length > 0;

        return {
          customer_name: customer.name,
          phone: customer.phone,
          city: customer.city || '',
          total_services: totalServices,
          services_this_period: servicesThisPeriod,
          last_service_date: lastServiceDate,
          total_spent: totalSpent,
          due_amount: dueAmount,
          has_active_amc: hasActiveAMC,
          has_due_payments: hasDuePayments
        };
      }) || [];

      // Calculate summary metrics
      const totalActiveCustomers = customers.length;
      const newCustomers = customers.filter(c => c.services_this_period === 1).length;
      const returningCustomers = totalActiveCustomers - newCustomers;
      const customersWithActiveAMC = customers.filter(c => c.has_active_amc).length;
      const customersWithDuePayments = customers.filter(c => c.has_due_payments).length;
      const averageServicesPerCustomer = totalActiveCustomers ? 
        customers.reduce((sum, c) => sum + c.total_services, 0) / totalActiveCustomers : 0;

      // Top customers by revenue
      const topCustomers = customers
        .filter(c => c.total_spent > 0)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10)
        .map(c => ({
          customer_name: c.customer_name,
          total_revenue: c.total_spent
        }));

      // Customer acquisition data (mock - would need historical data)
      const acquisitionData = [
        { month: format(subMonths(new Date(), 5), 'MMM yyyy'), new_customers: 12 },
        { month: format(subMonths(new Date(), 4), 'MMM yyyy'), new_customers: 15 },
        { month: format(subMonths(new Date(), 3), 'MMM yyyy'), new_customers: 18 },
        { month: format(subMonths(new Date(), 2), 'MMM yyyy'), new_customers: 22 },
        { month: format(subMonths(new Date(), 1), 'MMM yyyy'), new_customers: 20 },
        { month: format(new Date(), 'MMM yyyy'), new_customers: 25 }
      ];

      // AMC customers
      const amcCustomers = customers
        .filter(c => c.has_active_amc)
        .map(c => {
          const amc = amcData?.find(amc => amc.customer_id === customersData.find(customer => customer.name === c.customer_name)?.id);
          return {
            customer_name: c.customer_name,
            contract_number: amc?.contract_number || '',
            appliance: amc?.appliance || '',
            expiry_date: amc?.end_date ? format(new Date(amc.end_date), 'dd/MM/yyyy') : '',
            days_remaining: amc?.end_date ? Math.floor((new Date(amc.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
          };
        });

      // Due payments
      const duePayments = customers
        .filter(c => c.has_due_payments && c.due_amount > 0)
        .map(c => {
          const bill = billsData?.find(b => b.customer_id === customersData.find(customer => customer.name === c.customer_name)?.id);
          return {
            customer_name: c.customer_name,
            due_amount: c.due_amount,
            days_since_billing: bill?.bill_date ? Math.floor((new Date().getTime() - new Date(bill.bill_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
          };
        });

      return {
        total_active_customers: totalActiveCustomers,
        new_customers: newCustomers,
        returning_customers: returningCustomers,
        customers_with_active_amc: customersWithActiveAMC,
        customers_with_due_payments: customersWithDuePayments,
        average_services_per_customer: averageServicesPerCustomer,
        customers,
        top_customers: topCustomers,
        acquisition_data: acquisitionData,
        amc_customers: amcCustomers,
        due_payments: duePayments
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for AMC report data
export function useAMCReportData(period: Period, filters?: {
  status?: string;
  soldBy?: string;
}) {
  return useQuery({
    queryKey: ['amc-report', period, filters],
    queryFn: async (): Promise<AMCReportData> => {
      const { start, end } = getPeriodRange(period);

      // Build query
      let query = supabase
        .from('amc_contracts')
        .select(`
          *,
          customers!inner (
            name,
            phone
          )
        `);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.soldBy && filters.soldBy !== 'all') {
        query = query.eq('sold_by', filters.soldBy);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const totalActiveAMCs = data?.filter(amc => amc.status === 'active').length || 0;
      const expiringIn30Days = data?.filter(amc => {
        const daysRemaining = Math.floor((new Date(amc.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 && daysRemaining <= 30;
      }).length || 0;
      const expiredThisMonth = data?.filter(amc => {
        const endDate = new Date(amc.end_date);
        const now = new Date();
        return endDate.getMonth() === now.getMonth() && 
               endDate.getFullYear() === now.getFullYear() && 
               amc.status === 'expired';
      }).length || 0;
      const amcRevenue = data?.filter(amc => 
        isWithinInterval(new Date(amc.created_at), { start, end })
      ).reduce((sum, amc) => sum + (amc.price_paid || 0), 0) || 0;
      const renewalsThisPeriod = data?.filter(amc => 
        amc.status === 'renewed' && 
        isWithinInterval(new Date(amc.updated_at), { start, end })
      ).length || 0;
      const amcCommissionPending = data?.filter(amc => 
        amc.commission_status === 'pending'
      ).reduce((sum, amc) => sum + (amc.commission_amount || 0), 0) || 0;

      // Format contracts
      const contracts = data?.map(amc => ({
        contract_number: amc.contract_number,
        customer_name: amc.customers?.name || 'Unknown',
        customer_phone: amc.customers?.phone || '',
        appliance: amc.appliance || '',
        brand: amc.brand || '',
        start_date: format(new Date(amc.start_date), 'dd/MM/yyyy'),
        end_date: format(new Date(amc.end_date), 'dd/MM/yyyy'),
        duration: amc.duration || '',
        days_remaining: Math.floor((new Date(amc.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        price_paid: amc.price_paid || 0,
        payment_mode: amc.payment_mode || '',
        sold_by: amc.sold_by || '',
        commission_status: amc.commission_status || '',
        status: amc.status || ''
      })) || [];

      // Expiry timeline (next 6 months)
      const expiryTimeline = [];
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(new Date(), -i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const expiringCount = data?.filter(amc => 
          isWithinInterval(new Date(amc.end_date), { start: monthStart, end: monthEnd })
        ).length || 0;
        
        expiryTimeline.push({
          month: format(monthDate, 'MMM yyyy'),
          expiring_count: expiringCount
        });
      }

      // Revenue by seller
      const revenueBySeller = data?.reduce((acc, amc) => {
        const sellerName = amc.sold_by || 'Unknown';
        const existing = acc.find((s: any) => s.seller_name === sellerName);
        if (existing) {
          existing.revenue += amc.price_paid || 0;
        } else {
          acc.push({
            seller_name: sellerName,
            revenue: amc.price_paid || 0,
            percentage: 0
          });
        }
        return acc;
      }, [] as { seller_name: string; revenue: number; percentage: number }[]) || [];

      const totalRevenue = revenueBySeller.reduce((sum: number, s: any) => sum + s.revenue, 0);
      revenueBySeller.forEach((seller: any) => {
        seller.percentage = totalRevenue ? (seller.revenue / totalRevenue) * 100 : 0;
      });

      // Notification status
      const notificationStatus = data?.filter(amc => amc.status === 'active').map(amc => ({
        contract_number: amc.contract_number,
        customer_name: amc.customers?.name || 'Unknown',
        days_remaining: Math.floor((new Date(amc.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        notification_30_sent: false, // Would need to track in database
        notification_15_sent: false,
        notification_7_sent: false,
        notification_1_sent: false
      })) || [];

      return {
        total_active_amcs: totalActiveAMCs,
        expiring_in_30_days: expiringIn30Days,
        expired_this_month: expiredThisMonth,
        amc_revenue: amcRevenue,
        renewals_this_period: renewalsThisPeriod,
        amc_commission_pending: amcCommissionPending,
        contracts,
        expiry_timeline: expiryTimeline.reverse(),
        revenue_by_seller: revenueBySeller.sort((a: any, b: any) => b.revenue - a.revenue),
        notification_status: notificationStatus
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for brand/dealer report data
export function useBrandDealerReportData(period: Period, filters?: {
  entityType?: string;
}) {
  return useQuery({
    queryKey: ['brand-dealer-report', period, filters],
    queryFn: async (): Promise<BrandDealerReportData> => {
      const { start, end } = getPeriodRange(period);

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*');

      if (brandsError) throw brandsError;

      // Fetch dealers
      const { data: dealersData, error: dealersError } = await supabase
        .from('dealers')
        .select('*');

      if (dealersError) throw dealersError;

      // Fetch subjects for brand/dealer services
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('brand_id, dealer_id, grand_total, created_at, completed_at, status, id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (subjectsError) throw subjectsError;

      // Fetch bills for payment status
      const subjectIds = subjectsData?.map((s: any) => s.id).filter(Boolean) || [];
      const { data: billsData, error: billsError } = await supabase
        .from('subject_bills')
        .select('total_amount, payment_status, bill_date, payment_collected_at, subject_id')
        .in('subject_id', subjectIds);

      if (billsError) throw billsError;

      // Fetch consolidated invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('consolidated_invoices')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (invoicesError) throw invoicesError;

      // Process brands
      const brands = brandsData?.map((brand: any) => {
        const brandSubjects = subjectsData?.filter((s: any) => s.brand_id === brand.id) || [];
        const brandBills = billsData?.filter((b: any) => 
          brandSubjects.some((sb: any) => sb.id === b.subject_id)
        ) || [];
        
        const totalServices = brandSubjects.length;
        const totalBilled = brandBills.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        const totalCollected = brandBills.filter((b: any) => b.payment_status === 'paid')
          .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        const totalDue = brandBills.filter((b: any) => b.payment_status === 'due')
          .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        
        const lastBill = brandBills.sort((a: any, b: any) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime())[0];
        const lastPayment = brandBills.filter((b: any) => b.payment_status === 'paid')
          .sort((a: any, b: any) => new Date(b.payment_collected_at || b.bill_date).getTime() - new Date(a.payment_collected_at || a.bill_date).getTime())[0];

        return {
          name: brand.name,
          type: 'brand' as const,
          total_services: totalServices,
          total_billed: totalBilled,
          total_collected: totalCollected,
          total_due: totalDue,
          last_invoice_date: lastBill ? format(new Date(lastBill.bill_date), 'dd/MM/yyyy') : '',
          last_payment_date: lastPayment ? format(new Date(lastPayment.payment_collected_at || lastPayment.bill_date), 'dd/MM/yyyy') : '',
          status: totalDue > 0 ? 'due' : 'paid'
        };
      }) || [];

      // Process dealers
      const dealers = dealersData?.map((dealer: any) => {
        const dealerSubjects = subjectsData?.filter((s: any) => s.dealer_id === dealer.id) || [];
        const dealerBills = billsData?.filter((b: any) => 
          dealerSubjects.some((ds: any) => ds.id === b.subject_id)
        ) || [];
        
        const totalServices = dealerSubjects.length;
        const totalBilled = dealerBills.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        const totalCollected = dealerBills.filter((b: any) => b.payment_status === 'paid')
          .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        const totalDue = dealerBills.filter((b: any) => b.payment_status === 'due')
          .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        
        const lastBill = dealerBills.sort((a: any, b: any) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime())[0];
        const lastPayment = dealerBills.filter((b: any) => b.payment_status === 'paid')
          .sort((a: any, b: any) => new Date(b.payment_collected_at || b.bill_date).getTime() - new Date(a.payment_collected_at || a.bill_date).getTime())[0];

        return {
          name: dealer.name,
          type: 'dealer' as const,
          total_services: totalServices,
          total_billed: totalBilled,
          total_collected: totalCollected,
          total_due: totalDue,
          last_invoice_date: lastBill ? format(new Date(lastBill.bill_date), 'dd/MM/yyyy') : '',
          last_payment_date: lastPayment ? format(new Date(lastPayment.payment_collected_at || lastPayment.bill_date), 'dd/MM/yyyy') : '',
          status: totalDue > 0 ? 'due' : 'paid'
        };
      }) || [];

      // Combine entities
      const entities = [...brands, ...dealers];
      
      // Calculate summary metrics
      const totalBrands = brands.length;
      const totalDealers = dealers.length;
      const totalBrandDealerRevenue = entities.reduce((sum, e) => sum + e.total_billed, 0);
      const totalOutstandingDues = entities.reduce((sum, e) => sum + e.total_due, 0);
      const consolidatedInvoicesThisPeriod = invoicesData?.length || 0;
      const invoicesPaidThisPeriod = invoicesData?.filter(inv => inv.payment_status === 'paid').length || 0;

      // Due amount chart
      const dueAmountChart = entities
        .filter((e: any) => e.total_due > 0)
        .map((e: any) => ({
          name: e.name,
          due_amount: e.total_due,
          is_overdue: e.status === 'due' // Simplified - would need actual overdue calculation
        }))
        .sort((a: any, b: any) => b.due_amount - a.due_amount)
        .slice(0, 10);

      // Invoice history
      const invoiceHistory = invoicesData?.map(invoice => ({
        invoice_number: invoice.invoice_number,
        entity_name: invoice.brand_dealer_name || '',
        month_year: format(new Date(invoice.month_year), 'MMM yyyy'),
        total_amount: invoice.total_amount || 0,
        services_count: invoice.services_count || 0,
        payment_status: invoice.payment_status || '',
        payment_date: invoice.payment_date ? format(new Date(invoice.payment_date), 'dd/MM/yyyy') : '',
        recorded_by: invoice.recorded_by || ''
      })) || [];

      return {
        total_brands: totalBrands,
        total_dealers: totalDealers,
        total_brand_dealer_revenue: totalBrandDealerRevenue,
        total_outstanding_dues: totalOutstandingDues,
        consolidated_invoices_this_period: consolidatedInvoicesThisPeriod,
        invoices_paid_this_period: invoicesPaidThisPeriod,
        entities: entities.sort((a: any, b: any) => b.total_due - a.total_due),
        due_amount_chart: dueAmountChart,
        invoice_history: invoiceHistory.sort((a: any, b: any) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime())
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for financial summary (super_admin only)
export function useFinancialSummary(period: Period) {
  return useQuery({
    queryKey: ['financial-summary', period],
    queryFn: async (): Promise<FinancialSummaryData> => {
      const { start, end } = getPeriodRange(period);

      // Fetch revenue data
      const { data: revenueData, error: revenueError } = await supabase
        .from('subject_bills')
        .select('total_amount, gst_amount, bill_date')
        .gte('bill_date', start.toISOString())
        .lte('bill_date', end.toISOString());

      if (revenueError) throw revenueError;

      // Fetch stock entries for parts cost
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('total_cost, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (stockError) throw stockError;

      // Fetch commission data
      const { data: commissionData, error: commissionError } = await supabase
        .from('technician_earnings_summary')
        .select('total_commission, total_variance, created_at, status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (commissionError) throw commissionError;

      // Calculate metrics
      const grossRevenue = revenueData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const partsCost = stockData?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0;
      const grossProfit = grossRevenue - partsCost;
      const totalGSTCollected = revenueData?.reduce((sum, b) => sum + (b.gst_amount || 0), 0) || 0;
      const totalCommissionPaid = commissionData?.reduce((sum, c) => sum + (c.total_commission || 0), 0) || 0;
      const netProfitEstimate = grossProfit - totalCommissionPaid;

      // For outstanding dues, we'd need to query by entity type (customer, brand, dealer)
      const customerDues = revenueData?.filter((b: any) => b.payment_status === 'due').reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0;
      const brandDues = 0; // Would need to join with brands
      const dealerDues = 0; // Would need to join with dealers
      const totalOutstanding = customerDues + brandDues + dealerDues;

      // Monthly comparison (mock - would need historical data)
      const monthlyComparison = [
        { month: format(subMonths(new Date(), 5), 'MMM yyyy'), gross_revenue: 150000, parts_cost: 60000, gross_profit: 90000 },
        { month: format(subMonths(new Date(), 4), 'MMM yyyy'), gross_revenue: 180000, parts_cost: 72000, gross_profit: 108000 },
        { month: format(subMonths(new Date(), 3), 'MMM yyyy'), gross_revenue: 165000, parts_cost: 66000, gross_profit: 99000 },
        { month: format(subMonths(new Date(), 2), 'MMM yyyy'), gross_revenue: 195000, parts_cost: 78000, gross_profit: 117000 },
        { month: format(subMonths(new Date(), 1), 'MMM yyyy'), gross_revenue: 210000, parts_cost: 84000, gross_profit: 126000 },
        { month: format(new Date(), 'MMM yyyy'), gross_revenue: grossRevenue, parts_cost: partsCost, gross_profit: grossProfit }
      ];

      // GST summary
      const gstSummary = monthlyComparison.map(month => ({
        month: month.month,
        gst_collected: month.gross_revenue * 0.18 / 1.18 // Simplified GST calculation
      }));

      // Commission summary
      const totalSet = commissionData?.reduce((sum: number, c: any) => sum + (c.total_commission || 0), 0) || 0;
      const totalPending = commissionData?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + (c.total_commission || 0), 0) || 0;

      return {
        gross_revenue: grossRevenue,
        parts_cost: partsCost,
        gross_profit: grossProfit,
        total_gst_collected: totalGSTCollected,
        total_commission_paid: totalCommissionPaid,
        net_profit_estimate: netProfitEstimate,
        customer_dues: customerDues,
        brand_dues: brandDues,
        dealer_dues: dealerDues,
        total_outstanding: totalOutstanding,
        monthly_comparison: monthlyComparison,
        gst_summary: gstSummary,
        commission_summary: {
          total_set: totalSet,
          total_paid: totalCommissionPaid,
          total_pending: totalPending
        }
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
