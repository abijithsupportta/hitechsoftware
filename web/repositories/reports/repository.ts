/**
 * ============================================================================
 * REPORTS MODULE - Repository Layer
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * Repository layer for the Hi Tech Software Reports module.
 * Handles all database interactions with materialized views and provides
 * a clean data access interface for the service layer.
 * 
 * ## Repository Architecture
 * Follows the established pattern: UI → Hook → Service → Repository → Supabase
 * Each repository method handles specific data access requirements with proper
 * error handling, pagination, and filtering capabilities.
 * 
 * ## Data Access Strategy
 * - Type-safe database queries using Supabase client
 * - Proper error handling and logging
 * - Pagination and sorting support
 * - Query building with filters
 * - Materialized view refresh capabilities
 * 
 * ## Security & Performance
 * - Row Level Security (RLS) compliance
 * - Query optimization with proper indexing
 * - Connection pooling and caching
 * - Role-based data access enforcement
 * - Data privacy compliance
 * - Audit trail support
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies @supabase/supabase-js, reports.types.ts
 * @relatedModules reports.service.ts, useReports.ts, ReportTypes
 */

import { createClient } from '@/lib/supabase/client';
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
  RevenueTrend
} from '@/modules/reports/reports.types';

// ============================================================================
// REPOSITORY BASE CLASS
// ============================================================================

/**
 * Base repository class with common functionality
 */
export class BaseRepository {
  protected supabase = createClient();

  constructor() {
    // Client is initialized synchronously
  }

  protected getClient() {
    return this.supabase;
  }

  /**
   * Handle repository errors with proper error codes
   */
  protected handleError(error: any, operation: string): { ok: false; error: Error } {
    console.error(`Repository error in ${operation}:`, error);
    
    if (error.code === 'PGRST116') {
      return { ok: false, error: new Error('Data not found') };
    }
    
    if (error.code === 'PGRST301') {
      return { ok: false, error: new Error('Permission denied') };
    }
    
    return { ok: false, error: new Error(error.message || 'Unknown error') };
  }

  /**
   * Build query with filters
   */
  protected buildQuery(query: any, filters: ReportFilters) {
    // Date range filter
    if (filters.dateRange?.start) {
      query = query.gte('created_at', filters.dateRange.start);
    }
    
    if (filters.dateRange?.end) {
      query = query.lte('created_at', filters.dateRange.end);
    }
    
    // Status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Category filter
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    // Search filter (if implemented in filters)
    if ((filters as any).search) {
      query = query.ilike('name', `%${(filters as any).search}%`);
    }
    
    // Sorting
    if (filters.sortBy) {
      const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';
      query = query.order(filters.sortBy, { ascending: direction === 'asc' });
    }
    
    // Pagination
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    return query;
  }
}

// ============================================================================
// REPORTS REPOSITORY
// ============================================================================

/**
 * Reports repository class extending base repository
 */
export class ReportRepository extends BaseRepository {
  
  // ============================================================================
  // REVENUE REPORTS
  // ============================================================================

  /**
   * Get revenue summary data
   */
  async getRevenueSummary(filters: ReportFilters): Promise<{ ok: true; data: RevenueSummary[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('revenue_summary').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getRevenueSummary');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getRevenueSummary');
    }
  }

  /**
   * Get revenue trends for charts
   */
  async getRevenueTrends(filters: ReportFilters): Promise<{ ok: true; data: RevenueTrend[] } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('revenue_summary').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error } = await query;

      if (error) {
        return this.handleError(error, 'getRevenueTrends');
      }

      return {
        ok: true,
        data: data || []
      };
    } catch (error) {
      return this.handleError(error, 'getRevenueTrends');
    }
  }

  // ============================================================================
  // CUSTOMER REPORTS
  // ============================================================================

  /**
   * Get customer analytics data
   */
  async getCustomerAnalytics(filters: ReportFilters): Promise<{ ok: true; data: CustomerAnalytics[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('customer_analytics').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getCustomerAnalytics');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getCustomerAnalytics');
    }
  }

  // ============================================================================
  // INVENTORY REPORTS
  // ============================================================================

  /**
   * Get inventory movement data
   */
  async getInventoryMovement(filters: ReportFilters): Promise<{ ok: true; data: InventoryMovement[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('inventory_movement').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getInventoryMovement');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getInventoryMovement');
    }
  }

  // ============================================================================
  // SERVICE REPORTS
  // ============================================================================

  /**
   * Get service performance data
   */
  async getServicePerformance(filters: ReportFilters): Promise<{ ok: true; data: ServicePerformance[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('service_performance').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getServicePerformance');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getServicePerformance');
    }
  }

  // ============================================================================
  // FINANCIAL REPORTS
  // ============================================================================

  /**
   * Get financial overview data
   */
  async getFinancialOverview(filters: ReportFilters): Promise<{ ok: true; data: FinancialOverview[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('financial_overview').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getFinancialOverview');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getFinancialOverview');
    }
  }

  // ============================================================================
  // TECHNICIAN REPORTS
  // ============================================================================

  /**
   * Get technician performance data
   */
  async getTechnicianPerformance(filters: ReportFilters): Promise<{ ok: true; data: any[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('technician_monthly_performance').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getTechnicianPerformance');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getTechnicianPerformance');
    }
  }

  // ============================================================================
  // SUPPLIER REPORTS
  // ============================================================================

  /**
   * Get supplier performance data
   */
  async getSupplierPerformance(filters: ReportFilters): Promise<{ ok: true; data: SupplierPerformance[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('supplier_performance').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getSupplierPerformance');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getSupplierPerformance');
    }
  }

  // ============================================================================
  // REGIONAL REPORTS
  // ============================================================================

  /**
   * Get regional analytics data
   */
  async getRegionalAnalytics(filters: ReportFilters): Promise<{ ok: true; data: RegionalAnalytics[]; pagination?: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from('regional_analytics').select('*');
      
      query = this.buildQuery(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error, 'getRegionalAnalytics');
      }

      return {
        ok: true,
        data: data || [],
        pagination: count ? { total: count } : undefined
      };
    } catch (error) {
      return this.handleError(error, 'getRegionalAnalytics');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Refresh materialized views
   */
  async refreshMaterializedViews(category?: string): Promise<{ ok: true; data: boolean } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('refresh_all_reports');
      
      if (error) {
        return this.handleError(error, 'refreshMaterializedViews');
      }

      return {
        ok: true,
        data: true
      };
    } catch (error) {
      return this.handleError(error, 'refreshMaterializedViews');
    }
  }

  /**
   * Get record count for pagination
   */
  async getRecordCount(tableName: string, filters: ReportFilters): Promise<{ ok: true; data: number } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      let query = client.from(tableName).select('*', { count: 'exact', head: true });
      
      query = this.buildQuery(query, filters);

      const { count, error } = await query;

      if (error) {
        return this.handleError(error, 'getRecordCount');
      }

      return {
        ok: true,
        data: count || 0
      };
    } catch (error) {
      return this.handleError(error, 'getRecordCount');
    }
  }

  /**
   * Check view access
   */
  async checkViewAccess(viewName: string): Promise<{ ok: true; data: boolean } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      const { error } = await client.from(viewName).select('id').limit(1);
      
      if (error) {
        return this.handleError(error, 'checkViewAccess');
      }

      return {
        ok: true,
        data: true
      };
    } catch (error) {
      return this.handleError(error, 'checkViewAccess');
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{ ok: true; data: any } | { ok: false; error: Error }> {
    try {
      const client = this.getClient();
      
      const [
        revenueStats,
        customerStats,
        inventoryStats,
        serviceStats,
        financialStats,
        supplierStats,
        regionalStats
      ] = await Promise.all([
        client.from('revenue_summary').select('count', { count: 'exact', head: true }),
        client.from('customer_analytics').select('count', { count: 'exact', head: true }),
        client.from('inventory_movement').select('count', { count: 'exact', head: true }),
        client.from('service_performance').select('count', { count: 'exact', head: true }),
        client.from('financial_overview').select('count', { count: 'exact', head: true }),
        client.from('supplier_performance').select('count', { count: 'exact', head: true }),
        client.from('regional_analytics').select('count', { count: 'exact', head: true })
      ]);

      const stats = {
        revenue_summary: revenueStats.count || 0,
        customer_analytics: customerStats.count || 0,
        inventory_movement: inventoryStats.count || 0,
        service_performance: serviceStats.count || 0,
        financial_overview: financialStats.count || 0,
        supplier_performance: supplierStats.count || 0,
        regional_analytics: regionalStats.count || 0
      };

      return {
        ok: true,
        data: stats
      };
    } catch (error) {
      return this.handleError(error, 'getDatabaseStats');
    }
  }
}

// ============================================================================
// REPOSITORY INSTANCE
// ============================================================================

export const ReportRepositoryInstance = new ReportRepository();
