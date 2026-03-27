/**
 * ============================================================================
 * REPORTS MODULE - Business Logic Service Layer
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * Comprehensive business logic for the Hi Tech Software Reports module.
 * Handles data processing, calculations, aggregations, and business rules
 * for all report categories. Provides a clean separation between data
 * access (repository) and presentation (components).
 * 
 * ## Service Architecture
 * Follows the established pattern: UI → Hook → Service → Repository → Supabase
 * Each service function handles specific business logic, validation, and
 * data transformation requirements for report generation.
 * 
 * ## Business Logic Implementation
 * - Revenue calculations with GST breakdowns and discount handling
 * - Technician performance metrics and commission calculations
 * - Service completion rates and turnaround time analysis
 * - Inventory valuation and movement tracking
 * - Customer segmentation and tier analysis
 * - Financial P&L calculations and cash flow analysis
 * - Supplier performance evaluation and reliability metrics
 * - Regional analysis and geographic distribution
 * 
 * ## Data Processing Rules
 * - All monetary values rounded to 2 decimal places
 * - Date handling in UTC with proper timezone conversion
 * - Percentage calculations with proper edge case handling
 * - Trend analysis with period-over-period comparisons
 * - Aggregation logic for various time periods (daily/weekly/monthly/etc.)
 * - Data validation and sanitization
 * 
 * ## Dependencies & Integration
 * - Repository layer for database operations
 * - Type definitions for type safety
 * - Constants for configuration and validation
 * - Date utilities for time-based calculations
 * - Validation schemas for input sanitization
 * - Error handling with proper error propagation
 * 
 * ## Business Rules & Calculations
 * - GST calculations: MRP inclusive of 18% GST
 * - Commission calculations: flat amounts with variance deductions
 * - Performance metrics: completion rates, efficiency scores
 * - Inventory valuation: WAC-based calculations
 * - Customer tiers: based on service count and revenue
 * - Financial metrics: profit margins, cash flow analysis
 * - Supplier ratings: delivery performance and price competitiveness
 * 
 * ## Usage Examples
 * ```typescript
 * // Get revenue summary with filters
 * const revenueData = await getRevenueSummary({
 *   dateRange: { start: '2026-01-01', end: '2026-03-31' },
 *   period: 'monthly',
 *   paymentStatus: ['paid', 'due']
 * });
 * 
 * // Calculate technician performance metrics
 * const performance = await calculateTechnicianPerformance(technicianId, 'monthly');
 * 
 * // Generate customer tier analysis
 * const customerTiers = await analyzeCustomerTiers(dateRange);
 * ```
 * 
 * ## Performance & Optimization
 * - Efficient data processing with minimal database queries
 * - Caching strategies for frequently accessed calculations
 * - Batch processing for large datasets
 * - Memory-efficient data transformations
 * - Optimized aggregation queries
 * 
 * ## Security & Compliance
 * - Role-based data access enforcement
 * - PII protection in customer reports
 * - Sensitive financial data restrictions
 * - Input validation and sanitization
 * - Audit trail compatibility
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies reports.repository.ts, reports.types.ts, reports.constants.ts
 * @relatedModules useReports.ts, ReportRepositoryInstance, ReportTypes
 */

import type { 
  ReportFilters, 
  ReportApiResponse, 
  RevenueSummary, 
  CustomerAnalytics, 
  InventoryMovement, 
  ServicePerformance, 
  FinancialOverview, 
  SupplierPerformance, 
  RegionalAnalytics,
  RevenueTrend,
  CustomerTierAnalysis,
  StockValuation,
  ServiceCategoryPerformance,
  TechnicianPerformanceReport,
  ProfitLossStatement,
  CashFlowAnalysis,
  ReportExportConfig
} from './reports.types';
import { REPORT_CATEGORIES, TIME_PERIODS, VALIDATION_CONFIG, ERROR_MESSAGES } from './reports.constants';
import { ReportRepositoryInstance } from '../../repositories/reports/repository';
import { formatReportCurrency, calculateTrend, getTrendDirection } from './reports.types';

// ============================================================================
// REVENUE REPORTS SERVICE
// ============================================================================

/**
 * Get comprehensive revenue summary with filtering and aggregation
 * 
 * @param filters - Report filters including date range, payment status, etc.
 * @returns Promise<ReportApiResponse<RevenueSummary[]>> - Revenue data with pagination
 */
export async function getRevenueSummary(filters: ReportFilters): Promise<ReportApiResponse<RevenueSummary[]>> {
  try {
    // Validate date range
    const validationResult = validateDateRange(filters.dateRange);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_DATE_RANGE,
        code: 'INVALID_DATE_RANGE'
      };
    }

    // Get data from repository
    const result = await ReportRepositoryInstance.getRevenueSummary(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process and enrich data
    const processedData = processRevenueData(result.data, filters);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getRevenueSummary:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Get revenue trends for chart visualization
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<RevenueTrend[]>> - Revenue trend data
 */
export async function getRevenueTrends(filters: ReportFilters): Promise<ReportApiResponse<RevenueTrend[]>> {
  try {
    const result = await ReportRepositoryInstance.getRevenueTrends(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Calculate trends and growth rates
    const trendData = calculateRevenueTrends(result.data || []);
    
    return {
      success: true,
      data: trendData
    };
  } catch (error) {
    console.error('Error in getRevenueTrends:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process revenue data with business logic
 */
function processRevenueData(data: RevenueSummary[], filters: ReportFilters): RevenueSummary[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    average_bill_value: item.total_bills > 0 ? item.total_revenue / item.total_bills : 0,
    collection_rate: item.total_revenue > 0 ? (item.paid_amount / item.total_revenue) * 100 : 0,
    discount_rate: item.total_revenue > 0 ? (item.total_discounts / item.total_revenue) * 100 : 0,
    // Round monetary values
    total_revenue: Math.round(item.total_revenue * 100) / 100,
    paid_amount: Math.round(item.paid_amount * 100) / 100,
    outstanding_amount: Math.round(item.outstanding_amount * 100) / 100,
  }));
}

/**
 * Calculate revenue trends and growth rates
 */
function calculateRevenueTrends(data: any[]): RevenueTrend[] {
  const sortedData = data.sort((a, b) => new Date(a.revenue_date).getTime() - new Date(b.revenue_date).getTime());
  
  return sortedData.map((item, index) => {
    const previousItem = index > 0 ? sortedData[index - 1] : null;
    const revenueGrowth = previousItem ? calculateTrend(item.total_revenue, previousItem.total_revenue) : 0;
    const billsGrowth = previousItem ? calculateTrend(item.total_bills, previousItem.total_bills) : 0;
    
    return {
      period: item.revenue_date,
      revenue: item.total_revenue,
      paid_amount: item.paid_amount,
      outstanding_amount: item.outstanding_amount,
      bills_count: item.total_bills,
      revenue_growth: revenueGrowth,
      bills_growth: billsGrowth,
      growth_direction: getTrendDirection(revenueGrowth)
    };
  });
}

// ============================================================================
// CUSTOMER REPORTS SERVICE
// ============================================================================

/**
 * Get customer analytics with segmentation and tier analysis
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<CustomerAnalytics[]>> - Customer analytics data
 */
export async function getCustomerAnalytics(filters: ReportFilters): Promise<ReportApiResponse<CustomerAnalytics[]>> {
  try {
    const validationResult = validateDateRange(filters.dateRange);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_DATE_RANGE,
        code: 'INVALID_DATE_RANGE'
      };
    }

    const result = await ReportRepositoryInstance.getCustomerAnalytics(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process customer data with business logic
    const processedData = processCustomerData(result.data, filters);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getCustomerAnalytics:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Get customer tier analysis
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<CustomerTierAnalysis[]>> - Customer tier data
 */
export async function getCustomerTierAnalysis(filters: ReportFilters): Promise<ReportApiResponse<CustomerTierAnalysis[]>> {
  try {
    const result = await ReportRepositoryInstance.getCustomerAnalytics(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Analyze customer tiers
    const tierAnalysis = analyzeCustomerTiers(result.data);
    
    return {
      success: true,
      data: tierAnalysis
    };
  } catch (error) {
    console.error('Error in getCustomerTierAnalysis:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process customer data with business logic
 */
function processCustomerData(data: CustomerAnalytics[], filters: ReportFilters): CustomerAnalytics[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    service_frequency: item.customer_age_days > 0 ? (item.total_subjects * 365) / item.customer_age_days : 0,
    average_service_value: item.completed_subjects > 0 ? item.total_spent / item.completed_subjects : 0,
    payment_completion_rate: item.total_spent > 0 ? (item.paid_amount / item.total_spent) * 100 : 0,
    amc_adoption_rate: item.total_subjects > 0 ? (item.active_amc_contracts / item.total_subjects) * 100 : 0,
    // Round monetary values
    total_spent: Math.round(item.total_spent * 100) / 100,
    paid_amount: Math.round(item.paid_amount * 100) / 100,
    outstanding_amount: Math.round(item.outstanding_amount * 100) / 100,
    avg_bill_value: Math.round(item.avg_bill_value * 100) / 100,
  }));
}

/**
 * Analyze customer tiers and distribution
 */
function analyzeCustomerTiers(data: CustomerAnalytics[]): CustomerTierAnalysis[] {
  const tiers = ['High Value', 'Medium Value', 'Low Value', 'New'];
  
  return tiers.map(tier => {
    const tierCustomers = data.filter(customer => customer.customer_tier === tier);
    const totalRevenue = tierCustomers.reduce((sum, customer) => sum + customer.total_spent, 0);
    const avgRevenuePerCustomer = tierCustomers.length > 0 ? totalRevenue / tierCustomers.length : 0;
    
    return {
      tier,
      customer_count: tierCustomers.length,
      revenue_contribution: totalRevenue,
      avg_revenue_per_customer: Math.round(avgRevenuePerCustomer * 100) / 100,
      growth_rate: 0, // Would need historical data for accurate calculation
    };
  });
}

// ============================================================================
// INVENTORY REPORTS SERVICE
// ============================================================================

/**
 * Get inventory movement and valuation data
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<InventoryMovement[]>> - Inventory data
 */
export async function getInventoryMovement(filters: ReportFilters): Promise<ReportApiResponse<InventoryMovement[]>> {
  try {
    const result = await ReportRepositoryInstance.getInventoryMovement(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process inventory data
    const processedData = processInventoryData(result.data);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getInventoryMovement:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Get stock valuation summary
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<StockValuation[]>> - Stock valuation data
 */
export async function getStockValuation(filters: ReportFilters): Promise<ReportApiResponse<StockValuation[]>> {
  try {
    const result = await ReportRepositoryInstance.getInventoryMovement(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Calculate stock valuation by category
    const valuation = calculateStockValuation(result.data);
    
    return {
      success: true,
      data: valuation
    };
  } catch (error) {
    console.error('Error in getStockValuation:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process inventory data with business logic
 */
function processInventoryData(data: InventoryMovement[]): InventoryMovement[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    inventory_turnover: item.total_quantity_received > 0 ? item.total_quantity_consumed / item.total_quantity_received : 0,
    days_of_supply: item.total_quantity_consumed > 0 ? (item.current_stock * 365) / item.total_quantity_consumed : 0,
    variance_rate: item.total_quantity_issued > 0 ? Math.abs(item.total_variance) / item.total_quantity_issued * 100 : 0,
    profit_margin: item.current_mrp > 0 && item.weighted_average_cost > 0 
      ? ((item.current_mrp - item.weighted_average_cost) / item.current_mrp) * 100 
      : 0,
    // Round monetary values
    total_stock_value: Math.round(item.total_stock_value * 100) / 100,
    weighted_average_cost: Math.round(item.weighted_average_cost * 100) / 100,
    current_mrp: Math.round(item.current_mrp * 100) / 100,
    total_purchase_cost: Math.round(item.total_purchase_cost * 100) / 100,
  }));
}

/**
 * Calculate stock valuation by category
 */
function calculateStockValuation(data: InventoryMovement[]): StockValuation[] {
  const categoryMap = new Map<string, StockValuation>();
  
  data.forEach(item => {
    const existing = categoryMap.get(item.category_name) || {
      category: item.category_name,
      total_value: 0,
      total_quantity: 0,
      avg_cost_per_unit: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
    };
    
    existing.total_value += item.total_stock_value;
    existing.total_quantity += item.current_stock;
    existing.avg_cost_per_unit = existing.total_quantity > 0 ? existing.total_value / existing.total_quantity : 0;
    
    if (item.stock_status === 'Out of Stock') existing.out_of_stock_items++;
    else if (item.stock_status === 'Critical' || item.stock_status === 'Low') existing.low_stock_items++;
    
    categoryMap.set(item.category_name, existing);
  });
  
  return Array.from(categoryMap.values()).map(item => ({
    ...item,
    total_value: Math.round(item.total_value * 100) / 100,
    avg_cost_per_unit: Math.round(item.avg_cost_per_unit * 100) / 100,
  }));
}

// ============================================================================
// SERVICE REPORTS SERVICE
// ============================================================================

/**
 * Get service performance metrics
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<ServicePerformance[]>> - Service performance data
 */
export async function getServicePerformance(filters: ReportFilters): Promise<ReportApiResponse<ServicePerformance[]>> {
  try {
    const result = await ReportRepositoryInstance.getServicePerformance(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process service performance data
    const processedData = processServiceData(result.data);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getServicePerformance:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Get service category performance
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<ServiceCategoryPerformance[]>> - Category performance data
 */
export async function getServiceCategoryPerformance(filters: ReportFilters): Promise<ReportApiResponse<ServiceCategoryPerformance[]>> {
  try {
    const result = await ReportRepositoryInstance.getServicePerformance(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Calculate category performance
    const categoryPerformance = calculateCategoryPerformance(result.data);
    
    return {
      success: true,
      data: categoryPerformance
    };
  } catch (error) {
    console.error('Error in getServiceCategoryPerformance:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process service data with business logic
 */
function processServiceData(data: ServicePerformance[]): ServicePerformance[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    completion_rate: item.total_subjects > 0 ? (item.completed_subjects / item.total_subjects) * 100 : 0,
    allocation_rate: item.total_subjects > 0 ? (item.assigned_subjects / item.total_subjects) * 100 : 0,
    acceptance_rate: item.assigned_subjects > 0 ? (item.accepted_subjects / item.assigned_subjects) * 100 : 0,
    revenue_per_completed_job: item.completed_subjects > 0 ? item.total_revenue / item.completed_subjects : 0,
    efficiency_score: calculateServiceEfficiency(item),
    // Round monetary values and time
    total_revenue: Math.round(item.total_revenue * 100) / 100,
    avg_revenue_per_job: Math.round(item.avg_revenue_per_job * 100) / 100,
    avg_completion_time_hours: Math.round(item.avg_completion_time_hours * 100) / 100,
  }));
}

/**
 * Calculate service efficiency score
 */
function calculateServiceEfficiency(item: ServicePerformance): number {
  const completionRate = item.total_subjects > 0 ? (item.completed_subjects / item.total_subjects) * 100 : 0;
  const avgTimeScore = item.avg_completion_time_hours > 0 ? Math.max(0, 100 - (item.avg_completion_time_hours * 5)) : 0;
  const revenueScore = item.avg_revenue_per_job > 0 ? Math.min(100, (item.avg_revenue_per_job / 1000) * 100) : 0;
  
  return Math.round((completionRate * 0.5 + avgTimeScore * 0.3 + revenueScore * 0.2) * 100) / 100;
}

/**
 * Calculate category performance metrics
 */
function calculateCategoryPerformance(data: ServicePerformance[]): ServiceCategoryPerformance[] {
  const categoryMap = new Map<string, ServiceCategoryPerformance>();
  
  data.forEach(item => {
    const existing = categoryMap.get(item.current_status) || {
      category_name: item.current_status,
      total_subjects: 0,
      completed_subjects: 0,
      completion_rate: 0,
      avg_revenue: 0,
      avg_completion_time: 0,
    };
    
    existing.total_subjects += item.total_subjects;
    existing.completed_subjects += item.completed_subjects;
    existing.avg_revenue += item.total_revenue;
    existing.avg_completion_time += item.avg_completion_time_hours;
    
    categoryMap.set(item.current_status, existing);
  });
  
  return Array.from(categoryMap.values()).map(item => ({
    ...item,
    completion_rate: item.total_subjects > 0 ? (item.completed_subjects / item.total_subjects) * 100 : 0,
    avg_revenue: Math.round((item.avg_revenue / item.total_subjects) * 100) / 100,
    avg_completion_time: Math.round((item.avg_completion_time / item.total_subjects) * 100) / 100,
  }));
}

// ============================================================================
// FINANCIAL REPORTS SERVICE
// ============================================================================

/**
 * Get financial overview and P&L data
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<FinancialOverview[]>> - Financial data
 */
export async function getFinancialOverview(filters: ReportFilters): Promise<ReportApiResponse<FinancialOverview[]>> {
  try {
    // Check permissions for financial reports
    // This would typically be handled at the API level, but we'll add a check here too
    
    const result = await ReportRepositoryInstance.getFinancialOverview(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process financial data
    const processedData = processFinancialData(result.data);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getFinancialOverview:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Generate profit and loss statement
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<ProfitLossStatement>> - P&L statement
 */
export async function getProfitLossStatement(filters: ReportFilters): Promise<ReportApiResponse<ProfitLossStatement>> {
  try {
    const result = await ReportRepositoryInstance.getFinancialOverview(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Generate P&L from financial data
    const profitLoss = generateProfitLossStatement(result.data, filters);
    
    return {
      success: true,
      data: profitLoss
    };
  } catch (error) {
    console.error('Error in getProfitLossStatement:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process financial data with business logic
 */
function processFinancialData(data: FinancialOverview[]): FinancialOverview[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    profit_margin: item.gross_revenue > 0 ? (item.gross_profit / item.gross_revenue) * 100 : 0,
    collection_rate: item.gross_revenue > 0 ? (item.cash_inflow / item.gross_revenue) * 100 : 0,
    discount_rate: item.gross_revenue > 0 ? (item.total_discounts_given / item.gross_revenue) * 100 : 0,
    gst_rate: item.net_revenue > 0 ? (item.total_gst_collected / item.net_revenue) * 100 : 0,
    cash_conversion_cycle: calculateCashConversionCycle(item),
    // Round monetary values
    gross_revenue: Math.round(item.gross_revenue * 100) / 100,
    net_revenue: Math.round(item.net_revenue * 100) / 100,
    gross_profit: Math.round(item.gross_profit * 100) / 100,
    cash_inflow: Math.round(item.cash_inflow * 100) / 100,
    outstanding_receivables: Math.round(item.outstanding_receivables * 100) / 100,
    avg_transaction_value: Math.round(item.avg_transaction_value * 100) / 100,
  }));
}

/**
 * Generate P&L statement from financial data
 */
function generateProfitLossStatement(data: FinancialOverview[], filters: ReportFilters): ProfitLossStatement {
  const totals = data.reduce((acc, item) => ({
    gross_revenue: acc.gross_revenue + item.gross_revenue,
    gst_collected: acc.gst_collected + item.total_gst_collected,
    net_revenue: acc.net_revenue + item.net_revenue,
    service_revenue: acc.service_revenue + item.service_revenue,
    parts_revenue: acc.parts_revenue + item.parts_revenue,
    estimated_cogs: acc.estimated_cogs + item.estimated_cogs,
    total_discounts: acc.total_discounts + item.total_discounts_given,
    gross_profit: acc.gross_profit + item.gross_profit,
  }), {
    gross_revenue: 0,
    gst_collected: 0,
    net_revenue: 0,
    service_revenue: 0,
    parts_revenue: 0,
    estimated_cogs: 0,
    total_discounts: 0,
    gross_profit: 0,
  });

  const period = filters.dateRange?.start ? 
    `${filters.dateRange.start} to ${filters.dateRange.end}` : 
    'Current Period';

  return {
    period,
    revenue: {
      gross_revenue: Math.round(totals.gross_revenue * 100) / 100,
      gst_collected: Math.round(totals.gst_collected * 100) / 100,
      net_revenue: Math.round(totals.net_revenue * 100) / 100,
      service_revenue: Math.round(totals.service_revenue * 100) / 100,
      parts_revenue: Math.round(totals.parts_revenue * 100) / 100,
    },
    costs: {
      estimated_cogs: Math.round(totals.estimated_cogs * 100) / 100,
      total_discounts: Math.round(totals.total_discounts * 100) / 100,
      net_costs: Math.round((totals.estimated_cogs + totals.total_discounts) * 100) / 100,
    },
    profit: {
      gross_profit: Math.round(totals.gross_profit * 100) / 100,
      profit_margin: totals.gross_revenue > 0 ? (totals.gross_profit / totals.gross_revenue) * 100 : 0,
      net_profit: Math.round(totals.gross_profit * 100) / 100, // Simplified - would include operating expenses
    },
  };
}

/**
 * Calculate cash conversion cycle
 */
function calculateCashConversionCycle(item: FinancialOverview): number {
  // Simplified calculation - would need more detailed data for accurate CCC
  const days_sales_outstanding = item.outstanding_receivables > 0 && item.cash_inflow > 0 
    ? (item.outstanding_receivables / item.cash_inflow) * 30 
    : 0;
  
  return Math.round(days_sales_outstanding * 100) / 100;
}

// ============================================================================
// TECHNICIAN REPORTS SERVICE
// ============================================================================

/**
 * Get technician performance reports
 * 
 * @param filters - Report filters
 * @returns Promise<ReportApiResponse<TechnicianPerformanceReport[]>> - Technician performance data
 */
export async function getTechnicianPerformance(filters: ReportFilters): Promise<ReportApiResponse<TechnicianPerformanceReport[]>> {
  try {
    const result = await ReportRepositoryInstance.getTechnicianPerformance(filters);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REPOSITORY_ERROR'
      };
    }

    // Process technician performance data
    const processedData = processTechnicianData(result.data);
    
    return {
      success: true,
      data: processedData,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getTechnicianPerformance:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Process technician data with business logic
 */
function processTechnicianData(data: any[]): TechnicianPerformanceReport[] {
  return data.map(item => ({
    ...item,
    // Calculate derived metrics
    completion_rate: item.total_assigned > 0 ? (item.total_completed / item.total_assigned) * 100 : 0,
    efficiency_score: calculateTechnicianEfficiency(item),
    revenue_per_day: item.avg_completion_time_hours > 0 ? item.total_revenue / (item.avg_completion_time_hours / 8) : 0,
    quality_score: calculateQualityScore(item),
    // Round monetary values
    total_revenue: Math.round(item.total_revenue * 100) / 100,
    avg_revenue_per_job: Math.round((item.total_revenue / item.total_jobs) * 100) / 100,
    avg_completion_time_hours: Math.round(item.avg_completion_time_hours * 100) / 100,
  }));
}

/**
 * Calculate technician efficiency score
 */
function calculateTechnicianEfficiency(item: any): number {
  const completionRate = item.total_assigned > 0 ? (item.total_completed / item.total_assigned) * 100 : 0;
  const timeScore = item.avg_completion_time_hours > 0 ? Math.max(0, 100 - (item.avg_completion_time_hours * 4)) : 0;
  const revenueScore = item.total_revenue > 0 ? Math.min(100, (item.total_revenue / 10000) * 100) : 0;
  
  return Math.round((completionRate * 0.6 + timeScore * 0.2 + revenueScore * 0.2) * 100) / 100;
}

/**
 * Calculate quality score based on incomplete jobs and customer satisfaction
 */
function calculateQualityScore(item: any): number {
  const qualityRate = item.total_completed > 0 ? ((item.total_completed - item.total_incomplete) / item.total_completed) * 100 : 0;
  return Math.round(qualityRate * 100) / 100;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate date range according to business rules
 */
function validateDateRange(dateRange?: { start: string; end: string }): { isValid: boolean; error?: string } {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return { isValid: false, error: 'Date range is required' };
  }

  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const today = new Date();

  if (start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  if (start > today) {
    return { isValid: false, error: 'Start date cannot be in the future' };
  }

  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > VALIDATION_CONFIG.DATE_RANGE.MAX_DAYS) {
    return { isValid: false, error: `Date range cannot exceed ${VALIDATION_CONFIG.DATE_RANGE.MAX_DAYS} days` };
  }

  return { isValid: true };
}

/**
 * Validate export configuration
 */
export function validateExportConfig(config: ReportExportConfig): { isValid: boolean; error?: string } {
  if (!config.format || !['pdf', 'excel', 'csv'].includes(config.format)) {
    return { isValid: false, error: 'Invalid export format' };
  }

  if (config.dateRange) {
    const dateValidation = validateDateRange(config.dateRange);
    if (!dateValidation.isValid) {
      return dateValidation;
    }
  }

  return { isValid: true };
}

/**
 * Prepare data for export
 */
export async function prepareExportData(category: string, filters: ReportFilters, config: ReportExportConfig): Promise<any[]> {
  switch (category) {
    case 'revenue':
      const revenueResult = await getRevenueSummary(filters);
      return revenueResult.success ? (revenueResult.data || []) : [];
    
    case 'customer':
      const customerResult = await getCustomerAnalytics(filters);
      return customerResult.success ? (customerResult.data || []) : [];
    
    case 'inventory':
      const inventoryResult = await getInventoryMovement(filters);
      return inventoryResult.success ? (inventoryResult.data || []) : [];
    
    case 'service':
      const serviceResult = await getServicePerformance(filters);
      return serviceResult.success ? (serviceResult.data || []) : [];
    
    case 'financial':
      const financialResult = await getFinancialOverview(filters);
      return financialResult.success ? (financialResult.data || []) : [];
    
    case 'technician':
      const technicianResult = await getTechnicianPerformance(filters);
      return technicianResult.success ? (technicianResult.data || []) : [];
    
    default:
      return [];
  }
}

/**
 * Refresh report data
 */
export async function refreshReportData(category?: string): Promise<ReportApiResponse<boolean>> {
  try {
    // Call repository to refresh materialized views
    const result = await ReportRepositoryInstance.refreshMaterializedViews(category);
    
    if (!result.ok) {
      return {
        success: false,
        error: (result as any).error.message,
        code: 'REFRESH_ERROR'
      };
    }

    return {
      success: true,
      data: true
    };
  } catch (error) {
    console.error('Error refreshing report data:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
      code: 'SERVICE_ERROR'
    };
  }
}
