/**
 * ============================================================================
 * REPORTS MODULE - Comprehensive TypeScript Interfaces
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * Complete type definitions for the Hi Tech Software Reports module.
 * Provides type safety for all report data structures, API responses, and
 * component props across the comprehensive reporting system.
 * 
 * ## Report Categories
 * - Revenue Reports: Financial performance, billing, payment analysis
 * - Technician Reports: Performance, earnings, attendance analytics
 * - Service Reports: Job completion, turnaround time, status metrics
 * - Inventory Reports: Stock levels, movement, valuation analysis
 * - Customer Reports: Demographics, service history, tier analysis
 * - Financial Reports: P&L, cash flow, cost analysis
 * - Supplier Reports: Purchase analysis, performance metrics
 * - Regional Reports: Location-based service and revenue analysis
 * 
 * ## Architecture & Design Patterns
 * - Materialized view interfaces for database performance
 * - API response interfaces with standardized success/error patterns
 * - Component prop interfaces with proper typing
 * - Filter and parameter interfaces for flexible reporting
 * - Export interfaces for PDF/Excel functionality
 * 
 * ## Dependencies & Integration
 * - React Query for data fetching and caching
 * - Supabase for database operations
 * - @react-pdf/renderer for PDF generation
 * - Chart.js for data visualization
 * - Date utilities for time-based filtering
 * 
 * ## Business Rules & Logic
 * - All monetary values as numeric(14,2) precision
 * - Date handling in UTC with timezone conversion
 * - Role-based access control through type guards
 * - Pagination and filtering support
 * - Export format validation
 * 
 * ## Usage Examples
 * ```typescript
 * // Revenue report data
 * const revenueData: RevenueSummary = await getRevenueSummary(params);
 * 
 * // Customer analytics
 * const customerReport: CustomerAnalytics[] = await getCustomerAnalytics();
 * 
 * // Report filters
 * const filters: ReportFilters = {
 *   dateRange: { start: '2026-01-01', end: '2026-03-31' },
 *   category: 'revenue',
 *   period: 'monthly'
 * };
 * ```
 * 
 * ## Performance & Optimization
 * - Materialized views for complex aggregations
 * - Indexed queries for optimal performance
 * - Cached data with React Query
 * - Lazy loading for large datasets
 * - Efficient date range filtering
 * 
 * ## Security & Compliance
 * - Row Level Security (RLS) integration
 * - Role-based data access patterns
 * - Sensitive financial data protection
 * - Audit trail compatibility
 * - Data validation and sanitization
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies supabase, react-query, @react-pdf/renderer
 * @relatedModules reports.service.ts, reports.repository.ts, useReports.ts
 */

// ============================================================================
// BASE REPORT INTERFACES
// ============================================================================

/**
 * Base interface for all report data with common fields
 * Provides consistent structure across all report types
 */
export interface BaseReportData {
  id?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

/**
 * Standard API response interface for all report endpoints
 * Follows the established success/error pattern
 */
export interface ReportApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Report filters interface for flexible data querying
 * Supports date ranges, categories, and various filter options
 */
export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  category?: ReportCategory;
  period?: TimePeriod;
  status?: string[];
  technicianId?: string;
  customerId?: string;
  brandId?: string;
  dealerId?: string;
  supplierId?: string;
  region?: {
    city?: string;
    state?: string;
  };
  paymentMode?: string[];
  paymentStatus?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Report export configuration
 * Defines export format and options
 */
export interface ReportExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeSummary?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  title?: string;
  fileName?: string;
}

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Report categories for navigation and filtering
 */
export type ReportCategory = 
  | 'revenue'
  | 'technician'
  | 'service'
  | 'inventory'
  | 'customer'
  | 'financial'
  | 'supplier'
  | 'regional';

/**
 * Time periods for report aggregation
 */
export type TimePeriod = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

/**
 * Chart types for data visualization
 */
export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'doughnut';

/**
 * Export formats
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// ============================================================================
// REVENUE REPORT INTERFACES
// ============================================================================

/**
 * Revenue summary data from materialized view
 * Contains comprehensive revenue metrics across multiple dimensions
 */
export interface RevenueSummary extends BaseReportData {
  revenue_date: string;
  week_start: string;
  month_start: string;
  quarter_start: string;
  year_start: string;
  total_bills: number;
  total_revenue: number;
  total_visit_charges: number;
  total_service_charges: number;
  total_parts_amount: number;
  total_gst_amount: number;
  total_discounts: number;
  total_coupon_discounts: number;
  paid_bills: number;
  due_bills: number;
  partially_paid_bills: number;
  paid_amount: number;
  outstanding_amount: number;
  unique_customers: number;
  unique_technicians: number;
  unique_brands: number;
  unique_dealers: number;
}

/**
 * Revenue breakdown by payment mode
 */
export interface RevenueByPaymentMode {
  payment_mode: string;
  count: number;
  amount: number;
  percentage: number;
}

/**
 * Revenue trend data for chart visualization
 */
export interface RevenueTrend {
  period: string;
  revenue: number;
  paid_amount: number;
  outstanding_amount: number;
  bills_count: number;
}

/**
 * Top revenue customers
 */
export interface TopRevenueCustomer {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  bills_count: number;
  avg_bill_value: number;
}

// ============================================================================
// CUSTOMER REPORT INTERFACES
// ============================================================================

/**
 * Customer analytics data from materialized view
 * Comprehensive customer metrics and segmentation
 */
export interface CustomerAnalytics extends BaseReportData {
  customer_id: string;
  customer_since: string;
  primary_phone: string;
  primary_email: string;
  city: string;
  state: string;
  total_subjects: number;
  completed_subjects: number;
  pending_subjects: number;
  customer_jobs: number;
  brand_dealer_jobs: number;
  total_spent: number;
  paid_amount: number;
  outstanding_amount: number;
  avg_bill_value: number;
  first_service_date: string;
  last_service_date: string;
  unique_technicians_served: number;
  unique_brands_serviced: number;
  active_amc_count: number;
  active_amc_contracts: number;
  expiring_amc_contracts: number;
  customer_age_days: number;
  customer_tier: 'High Value' | 'Medium Value' | 'Low Value' | 'New';
}

/**
 * Customer distribution by city/region
 */
export interface CustomerDistribution {
  region: string;
  customer_count: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
}

/**
 * Customer tier analysis
 */
export interface CustomerTierAnalysis {
  tier: string;
  customer_count: number;
  revenue_contribution: number;
  avg_revenue_per_customer: number;
  growth_rate: number;
}

// ============================================================================
// INVENTORY REPORT INTERFACES
// ============================================================================

/**
 * Inventory movement data from materialized view
 * Complete stock analysis and movement tracking
 */
export interface InventoryMovement extends BaseReportData {
  product_id: string;
  product_name: string;
  material_code: string;
  category_name: string;
  product_type_name: string;
  current_stock: number;
  total_stock_value: number;
  weighted_average_cost: number;
  current_mrp: number;
  total_stock_entries: number;
  total_quantity_received: number;
  total_purchase_cost: number;
  avg_purchase_price: number;
  first_purchase_date: string;
  last_purchase_date: string;
  unique_suppliers: number;
  total_bag_issues: number;
  total_quantity_issued: number;
  total_consumptions: number;
  total_quantity_consumed: number;
  total_variance: number;
  stock_status: 'Out of Stock' | 'Critical' | 'Low' | 'Medium' | 'Adequate';
  days_since_last_purchase: number;
  product_condition: 'New' | 'Refurbished';
}

/**
 * Stock valuation summary
 */
export interface StockValuation {
  category: string;
  total_value: number;
  total_quantity: number;
  avg_cost_per_unit: number;
  low_stock_items: number;
  out_of_stock_items: number;
}

/**
 * Inventory turnover analysis
 */
export interface InventoryTurnover {
  product_id: string;
  product_name: string;
  turnover_ratio: number;
  days_of_supply: number;
  consumption_rate: number;
  reorder_point: number;
}

// ============================================================================
// SERVICE REPORT INTERFACES
// ============================================================================

/**
 * Service performance data from materialized view
 * Comprehensive service operation metrics
 */
export interface ServicePerformance extends BaseReportData {
  service_date: string;
  week_start: string;
  month_start: string;
  current_status: string;
  service_charge_type: string;
  priority: string;
  total_subjects: number;
  completed_subjects: number;
  incomplete_subjects: number;
  pending_subjects: number;
  allocated_subjects: number;
  accepted_subjects: number;
  arrived_subjects: number;
  in_progress_subjects: number;
  cancelled_subjects: number;
  assigned_subjects: number;
  avg_completion_time_hours: number;
  avg_allocation_to_completion_hours: number;
  total_revenue: number;
  avg_revenue_per_job: number;
  unique_technicians: number;
  unique_customers: number;
  unique_brands: number;
  unique_dealers: number;
  unique_categories: number;
  performance_rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

/**
 * Service status flow analysis
 */
export interface ServiceStatusFlow {
  from_status: string;
  to_status: string;
  count: number;
  avg_time_hours: number;
  conversion_rate: number;
}

/**
 * Service category performance
 */
export interface ServiceCategoryPerformance {
  category_name: string;
  total_subjects: number;
  completed_subjects: number;
  completion_rate: number;
  avg_revenue: number;
  avg_completion_time: number;
}

// ============================================================================
// FINANCIAL REPORT INTERFACES
// ============================================================================

/**
 * Financial overview data from materialized view
 * Complete financial health and P&L analysis
 */
export interface FinancialOverview extends BaseReportData {
  financial_date: string;
  month_start: string;
  quarter_start: string;
  year_start: string;
  total_transactions: number;
  gross_revenue: number;
  total_gst_collected: number;
  net_revenue: number;
  total_discounts_given: number;
  service_revenue: number;
  parts_revenue: number;
  cash_transactions: number;
  upi_transactions: number;
  card_transactions: number;
  bank_transfer_transactions: number;
  cash_revenue: number;
  upi_revenue: number;
  card_revenue: number;
  bank_transfer_revenue: number;
  paid_transactions: number;
  due_transactions: number;
  partially_paid_transactions: number;
  cash_inflow: number;
  outstanding_receivables: number;
  avg_transaction_value: number;
  estimated_cogs: number;
  gross_profit: number;
  profit_margin_percentage: number;
}

/**
 * Profit and loss statement
 */
export interface ProfitLossStatement {
  period: string;
  revenue: {
    gross_revenue: number;
    gst_collected: number;
    net_revenue: number;
    service_revenue: number;
    parts_revenue: number;
  };
  costs: {
    estimated_cogs: number;
    total_discounts: number;
    net_costs: number;
  };
  profit: {
    gross_profit: number;
    profit_margin: number;
    net_profit: number;
  };
}

/**
 * Cash flow analysis
 */
export interface CashFlowAnalysis {
  period: string;
  cash_inflows: {
    cash_payments: number;
    upi_payments: number;
    card_payments: number;
    bank_transfers: number;
    total_inflows: number;
  };
  cash_outflows: {
    inventory_purchases: number;
    operating_expenses: number;
    total_outflows: number;
  };
  net_cash_flow: number;
  cash_balance: number;
}

// ============================================================================
// TECHNICIAN REPORT INTERFACES
// ============================================================================

/**
 * Technician performance summary
 * Extends existing technician_monthly_performance view
 */
export interface TechnicianPerformanceReport {
  technician_id: string;
  technician_name: string;
  month: string;
  total_assigned: number;
  total_completed: number;
  total_incomplete: number;
  total_pending: number;
  total_allocated: number;
  total_accepted: number;
  total_arrived: number;
  total_in_progress: number;
  avg_completion_time_hours: number;
  total_revenue: number;
  brand_dealer_revenue: number;
  customer_revenue: number;
  total_jobs: number;
  completion_rate: number;
  avg_revenue_per_job: number;
  efficiency_score: number;
}

/**
 * Technician earnings analysis
 */
export interface TechnicianEarningsReport {
  technician_id: string;
  technician_name: string;
  period: string;
  total_earnings: number;
  service_commission: number;
  parts_commission: number;
  extra_price_commission: number;
  variance_deductions: number;
  net_earnings: number;
  payout_status: 'pending' | 'approved' | 'paid';
  jobs_completed: number;
  avg_earnings_per_job: number;
}

// ============================================================================
// SUPPLIER REPORT INTERFACES
// ============================================================================

/**
 * Supplier performance data from materialized view
 * Complete supplier analysis and metrics
 */
export interface SupplierPerformance extends BaseReportData {
  supplier_id: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  total_purchase_orders: number;
  recent_orders: number;
  total_quantity_purchased: number;
  total_purchase_value: number;
  avg_purchase_price: number;
  unique_products_purchased: number;
  unique_categories_purchased: number;
  first_purchase_date: string;
  last_purchase_date: string;
  days_since_last_purchase: number;
  orders_last_90_days: number;
  purchase_value_last_90_days: number;
  on_time_deliveries: number;
  total_with_expected_date: number;
  on_time_delivery_percentage: number;
  supplier_tier: 'High Volume' | 'Medium Volume' | 'Low Volume' | 'Inactive';
}

/**
 * Supplier comparison analysis
 */
export interface SupplierComparison {
  supplier_id: string;
  supplier_name: string;
  total_purchase_value: number;
  market_share: number;
  avg_price_competitiveness: number;
  reliability_score: number;
  overall_rating: number;
}

// ============================================================================
// REGIONAL REPORT INTERFACES
// ============================================================================

/**
 * Regional analytics data from materialized view
 * Location-based service and revenue analysis
 */
export interface RegionalAnalytics extends BaseReportData {
  city: string;
  state: string;
  service_date: string;
  month_start: string;
  unique_customers: number;
  total_subjects: number;
  completed_subjects: number;
  customer_jobs: number;
  brand_dealer_jobs: number;
  unique_technicians: number;
  total_revenue: number;
  paid_revenue: number;
  outstanding_revenue: number;
  avg_revenue_per_job: number;
  unique_brands: number;
  unique_dealers: number;
  active_amc_contracts: number;
  services_per_customer: number;
  revenue_concentration_percentage: number;
}

/**
 * Regional performance comparison
 */
export interface RegionalPerformanceComparison {
  region: string;
  total_revenue: number;
  revenue_growth: number;
  market_penetration: number;
  customer_satisfaction: number;
  service_efficiency: number;
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

/**
 * Props for ReportFilters component
 */
export interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  availableCategories: ReportCategory[];
  loading?: boolean;
}

/**
 * Props for ReportChart component
 */
export interface ReportChartProps {
  data: any[];
  chartType: ChartType;
  title?: string;
  xAxisKey: string;
  yAxisKey: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  format?: 'currency' | 'number' | 'percentage';
}

/**
 * Props for ReportTable component
 */
export interface ReportTableProps {
  data: any[];
  columns: TableColumn[];
  title?: string;
  sortable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  loading?: boolean;
  exportable?: boolean;
}

/**
 * Table column definition
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'text';
  width?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Props for ReportSummaryCards component
 */
export interface ReportSummaryCardsProps {
  cards: SummaryCard[];
  loading?: boolean;
  columns?: number;
}

/**
 * Summary card definition
 */
export interface SummaryCard {
  title: string;
  value: number | string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  format?: 'currency' | 'number' | 'percentage';
  color?: string;
  icon?: string;
}

/**
 * Props for ReportExportButton component
 */
export interface ReportExportButtonProps {
  config: ReportExportConfig;
  data: any[];
  loading?: boolean;
  disabled?: boolean;
  onExport?: (config: ReportExportConfig) => void;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Date range helper
 */
export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Report generation options
 */
export interface ReportGenerationOptions {
  includeCharts: boolean;
  includeTables: boolean;
  includeSummary: boolean;
  format: ExportFormat;
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Report validation result
 */
export interface ReportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for report category
 */
export function isValidReportCategory(category: string): category is ReportCategory {
  return ['revenue', 'technician', 'service', 'inventory', 'customer', 'financial', 'supplier', 'regional'].includes(category);
}

/**
 * Type guard for time period
 */
export function isValidTimePeriod(period: string): period is TimePeriod {
  return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(period);
}

/**
 * Type guard for chart type
 */
export function isValidChartType(type: string): type is ChartType {
  return ['line', 'bar', 'pie', 'area', 'scatter', 'doughnut'].includes(type);
}

/**
 * Type guard for export format
 */
export function isValidExportFormat(format: string): format is ExportFormat {
  return ['pdf', 'excel', 'csv'].includes(format);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for reports
 */
export function formatReportCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for reports
 */
export function formatReportPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format date for reports
 */
export function formatReportDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate trend percentage
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Determine trend direction
 */
export function getTrendDirection(trend: number): 'up' | 'down' | 'neutral' {
  if (trend > 0.5) return 'up';
  if (trend < -0.5) return 'down';
  return 'neutral';
}
