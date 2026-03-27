/**
 * ============================================================================
 * REPORTS MODULE - React Query Hooks
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * React Query hooks for the Hi Tech Software Reports module.
 * Provides data fetching, caching, and state management for all report
 * categories with proper error handling and loading states.
 * 
 * ## Hook Architecture
 * Follows the established pattern: UI → Hook → Service → Repository → Supabase
 * Each hook handles specific data fetching requirements with proper
 * caching strategies and error boundaries.
 * 
 * ## Data Fetching Strategy
 * - Intelligent caching with configurable stale times
 * - Background refetching for fresh data
 * - Optimistic updates where appropriate
 * - Proper error handling and retry logic
 * - Loading states and error boundaries
 * 
 * ## Cache Management
 * - Category-specific cache durations
 * - Query key management for invalidation
 * - Background refetching strategies
 * - Memory-efficient data storage
 * - Selective data refetching
 * 
 * ## Dependencies & Integration
 * - React Query for data fetching and caching
 * - Service layer for business logic
 * - Type definitions for type safety
 * - Error handling utilities
 * - Loading state management
 * 
 * ## Business Rules Implementation
 * - Role-based data fetching
 * - Permission-based cache invalidation
 * - Automatic data refresh on critical updates
 * - Proper error propagation
 * - User-friendly error messages
 * 
 * ## Usage Examples
 * ```typescript
 * // Use revenue report data
 * const { data, isLoading, error } = useRevenueReport(filters);
 * 
 * // Use customer analytics with custom options
 * const customerData = useCustomerAnalytics(filters, {
 *   staleTime: 10 * 60 * 1000,
 *   enabled: hasPermission
 * });
 * 
 * // Invalidate and refetch reports
 * const queryClient = useQueryClient();
 * queryClient.invalidateQueries(['reports']);
 * ```
 * 
 * ## Performance & Optimization
 * - Efficient query key generation
 * - Minimal re-renders with proper dependencies
 * - Background data fetching
 * - Selective data updates
 * - Memory leak prevention
 * 
 * ## Error Handling
 * - Graceful error degradation
 * - User-friendly error messages
 * - Automatic retry with exponential backoff
 * - Error boundary integration
 * - Fallback data strategies
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies @tanstack/react-query, reports.service.ts, reports.types.ts
 * @relatedModules reports.service.ts, ReportTypes, ReportComponents
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
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
  ReportExportConfig
} from '@/modules/reports/reports.types';
import { 
  getRevenueSummary,
  getRevenueTrends,
  getCustomerAnalytics,
  getCustomerTierAnalysis,
  getInventoryMovement,
  getStockValuation,
  getServicePerformance,
  getServiceCategoryPerformance,
  getFinancialOverview,
  getProfitLossStatement,
  getTechnicianPerformance,
  refreshReportData,
  prepareExportData,
  validateExportConfig
} from '@/modules/reports/reports.service';
import { QUERY_CONFIG, CACHE_DURATIONS, REPORT_CATEGORIES } from '@/modules/reports/reports.constants';
import { useAuth } from '@/hooks/auth/useAuth';

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Report query keys for cache management
 */
export const REPORT_QUERY_KEYS = {
  all: ['reports'] as const,
  revenue: ['reports', 'revenue'] as const,
  revenueTrends: ['reports', 'revenue', 'trends'] as const,
  customer: ['reports', 'customer'] as const,
  customerTiers: ['reports', 'customer', 'tiers'] as const,
  inventory: ['reports', 'inventory'] as const,
  stockValuation: ['reports', 'inventory', 'valuation'] as const,
  service: ['reports', 'service'] as const,
  serviceCategories: ['reports', 'service', 'categories'] as const,
  financial: ['reports', 'financial'] as const,
  profitLoss: ['reports', 'financial', 'profit-loss'] as const,
  technician: ['reports', 'technician'] as const,
  supplier: ['reports', 'supplier'] as const,
  regional: ['reports', 'regional'] as const,
  export: ['reports', 'export'] as const,
} as const;

// ============================================================================
// REVENUE REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching revenue summary data
 */
export function useRevenueReport(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<RevenueSummary[]>>, 'queryKey' | 'queryFn'>
) {
  const { userRole } = useAuth();
  
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.revenue, filters],
    queryFn: () => getRevenueSummary(filters),
    staleTime: CACHE_DURATIONS.revenue,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    enabled: true, // Will be refined based on permissions
    ...options,
  });
}

/**
 * Hook for fetching revenue trends data
 */
export function useRevenueTrends(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<RevenueTrend[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.revenueTrends, filters],
    queryFn: () => getRevenueTrends(filters),
    staleTime: CACHE_DURATIONS.revenue,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false, // Trends don't need frequent refresh
    ...options,
  });
}

// ============================================================================
// CUSTOMER REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching customer analytics data
 */
export function useCustomerAnalytics(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<CustomerAnalytics[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.customer, filters],
    queryFn: () => getCustomerAnalytics(filters),
    staleTime: CACHE_DURATIONS.customer,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    ...options,
  });
}

/**
 * Hook for fetching customer tier analysis
 */
export function useCustomerTierAnalysis(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<CustomerTierAnalysis[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.customerTiers, filters],
    queryFn: () => getCustomerTierAnalysis(filters),
    staleTime: CACHE_DURATIONS.customer,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ============================================================================
// INVENTORY REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching inventory movement data
 */
export function useInventoryMovement(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<InventoryMovement[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.inventory, filters],
    queryFn: () => getInventoryMovement(filters),
    staleTime: CACHE_DURATIONS.inventory,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    ...options,
  });
}

/**
 * Hook for fetching stock valuation data
 */
export function useStockValuation(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<StockValuation[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.stockValuation, filters],
    queryFn: () => getStockValuation(filters),
    staleTime: CACHE_DURATIONS.inventory,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ============================================================================
// SERVICE REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching service performance data
 */
export function useServicePerformance(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<ServicePerformance[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.service, filters],
    queryFn: () => getServicePerformance(filters),
    staleTime: CACHE_DURATIONS.service,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    ...options,
  });
}

/**
 * Hook for fetching service category performance
 */
export function useServiceCategoryPerformance(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<ServiceCategoryPerformance[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.serviceCategories, filters],
    queryFn: () => getServiceCategoryPerformance(filters),
    staleTime: CACHE_DURATIONS.service,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ============================================================================
// FINANCIAL REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching financial overview data
 */
export function useFinancialOverview(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<FinancialOverview[]>>, 'queryKey' | 'queryFn'>
) {
  const { userRole } = useAuth();
  
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.financial, filters],
    queryFn: () => getFinancialOverview(filters),
    staleTime: CACHE_DURATIONS.financial,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false, // Financial data is sensitive
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    enabled: userRole === 'super_admin', // Only super_admin can access financial reports
    ...options,
  });
}

/**
 * Hook for fetching profit and loss statement
 */
export function useProfitLossStatement(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<ProfitLossStatement>>, 'queryKey' | 'queryFn'>
) {
  const { userRole } = useAuth();
  
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.profitLoss, filters],
    queryFn: () => getProfitLossStatement(filters),
    staleTime: CACHE_DURATIONS.financial,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    enabled: userRole === 'super_admin',
    ...options,
  });
}

// ============================================================================
// TECHNICIAN REPORTS HOOKS
// ============================================================================

/**
 * Hook for fetching technician performance data
 */
export function useTechnicianPerformance(
  filters: ReportFilters,
  options?: Omit<UseQueryOptions<ReportApiResponse<TechnicianPerformanceReport[]>>, 'queryKey' | 'queryFn'>
) {
  const { userRole, user } = useAuth();
  
  return useQuery({
    queryKey: [...REPORT_QUERY_KEYS.technician, filters],
    queryFn: () => getTechnicianPerformance(filters),
    staleTime: CACHE_DURATIONS.technician,
    gcTime: QUERY_CONFIG.DEFAULT_CACHE_TIME,
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnReconnect: QUERY_CONFIG.REFETCH_ON_RECONNECT,
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for refreshing report data
 */
export function useRefreshReports() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (category?: string) => refreshReportData(category),
    onSuccess: () => {
      // Invalidate all report queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEYS.all });
    },
    onError: (error) => {
      console.error('Failed to refresh reports:', error);
    },
  });
}

/**
 * Hook for exporting report data
 */
export function useExportReport() {
  return useMutation({
    mutationFn: ({ category, filters, config }: { 
      category: string; 
      filters: ReportFilters; 
      config: ReportExportConfig 
    }) => {
      // Validate export configuration
      const validation = validateExportConfig(config);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      return prepareExportData(category, filters, config);
    },
    onError: (error) => {
      console.error('Failed to export report:', error);
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for report permissions and access control
 */
export function useReportPermissions() {
  const { userRole } = useAuth();
  
  const permissions = useMemo(() => {
    if (!userRole) return null;
    
    return {
      canViewRevenue: ['super_admin', 'office_staff'].includes(userRole),
      canViewCustomer: ['super_admin', 'office_staff'].includes(userRole),
      canViewInventory: ['super_admin', 'office_staff', 'stock_manager'].includes(userRole),
      canViewService: ['super_admin', 'office_staff'].includes(userRole),
      canViewFinancial: userRole === 'super_admin',
      canViewTechnician: ['super_admin', 'office_staff', 'technician'].includes(userRole),
      canViewSupplier: ['super_admin', 'office_staff', 'stock_manager'].includes(userRole),
      canViewRegional: ['super_admin', 'office_staff'].includes(userRole),
      canExport: userRole !== 'technician',
      canRefresh: ['super_admin', 'office_staff'].includes(userRole),
    };
  }, [userRole]);
  
  return permissions;
}

/**
 * Hook for getting available report categories based on user role
 */
export function useAvailableReportCategories() {
  const permissions = useReportPermissions();
  
  const availableCategories = useMemo(() => {
    if (!permissions) return [];
    
    return Object.entries(REPORT_CATEGORIES)
      .filter(([_, config]) => {
        switch (config.id) {
          case 'revenue':
            return permissions.canViewRevenue;
          case 'customer':
            return permissions.canViewCustomer;
          case 'inventory':
            return permissions.canViewInventory;
          case 'service':
            return permissions.canViewService;
          case 'financial':
            return permissions.canViewFinancial;
          case 'technician':
            return permissions.canViewTechnician;
          case 'supplier':
            return permissions.canViewSupplier;
          case 'regional':
            return permissions.canViewRegional;
          default:
            return false;
        }
      })
      .map(([key, config]) => config);
  }, [permissions]);
  
  return availableCategories;
}

/**
 * Hook for report data aggregation and summary calculations
 */
export function useReportSummary(category: string, filters: ReportFilters) {
  // Get the appropriate hook based on category
  const getHookForCategory = useCallback(() => {
    switch (category) {
      case 'revenue':
        return useRevenueReport(filters);
      case 'customer':
        return useCustomerAnalytics(filters);
      case 'inventory':
        return useInventoryMovement(filters);
      case 'service':
        return useServicePerformance(filters);
      case 'financial':
        return useFinancialOverview(filters);
      case 'technician':
        return useTechnicianPerformance(filters);
      default:
        return null;
    }
  }, [category, filters]);
  
  const query = getHookForCategory();
  
  const summary = useMemo(() => {
    if (!query?.data?.success || !query.data.data) {
      return null;
    }
    
    const data = query.data.data;
    
    // Calculate summary metrics based on category
    switch (category) {
      case 'revenue':
        return {
          total: data.reduce((sum, item: any) => sum + item.total_revenue, 0),
          count: data.length,
          average: data.length > 0 ? data.reduce((sum, item: any) => sum + item.total_revenue, 0) / data.length : 0,
        };
      
      case 'customer':
        return {
          total: data.length,
          active: data.filter((item: any) => item.total_subjects > 0).length,
          averageRevenue: data.length > 0 ? data.reduce((sum, item: any) => sum + item.total_spent, 0) / data.length : 0,
        };
      
      case 'inventory':
        return {
          total: data.length,
          lowStock: data.filter((item: any) => item.current_stock <= 5).length,
          totalValue: data.reduce((sum, item: any) => sum + item.total_stock_value, 0),
        };
      
      default:
        return {
          total: data.length,
        };
    }
  }, [category, query?.data]);
  
  return {
    ...query,
    summary,
  };
}

/**
 * Hook for batch report operations
 */
export function useBatchReportOperations() {
  const queryClient = useQueryClient();
  const refreshMutation = useRefreshReports();
  
  const invalidateCategory = useCallback((category: string) => {
    const categoryKey = REPORT_QUERY_KEYS[category as keyof typeof REPORT_QUERY_KEYS];
    if (categoryKey) {
      queryClient.invalidateQueries({ queryKey: categoryKey });
    }
  }, [queryClient]);
  
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEYS.all });
  }, [queryClient]);
  
  const prefetchReport = useCallback((category: string, filters: ReportFilters) => {
    const categoryKey = REPORT_QUERY_KEYS[category as keyof typeof REPORT_QUERY_KEYS];
    if (categoryKey) {
      queryClient.prefetchQuery({
        queryKey: [...categoryKey, filters],
        queryFn: async () => {
          // Dynamically call the appropriate service function
          switch (category) {
            case 'revenue':
              return await getRevenueSummary(filters);
            case 'customer':
              return await getCustomerAnalytics(filters);
            case 'inventory':
              return await getInventoryMovement(filters);
            case 'service':
              return await getServicePerformance(filters);
            case 'financial':
              return await getFinancialOverview(filters);
            case 'technician':
              return await getTechnicianPerformance(filters);
            default:
              return { success: false, error: 'Unknown category' };
          }
        },
        staleTime: CACHE_DURATIONS[category as keyof typeof CACHE_DURATIONS] || QUERY_CONFIG.DEFAULT_STALE_TIME,
      });
    }
  }, [queryClient]);
  
  return {
    invalidateCategory,
    invalidateAll,
    prefetchReport,
    refreshAll: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
  };
}

// ============================================================================
// EXPORTED UTILITIES
// ============================================================================

export default {
  // Query hooks
  useRevenueReport,
  useRevenueTrends,
  useCustomerAnalytics,
  useCustomerTierAnalysis,
  useInventoryMovement,
  useStockValuation,
  useServicePerformance,
  useServiceCategoryPerformance,
  useFinancialOverview,
  useProfitLossStatement,
  useTechnicianPerformance,
  
  // Mutation hooks
  useRefreshReports,
  useExportReport,
  
  // Utility hooks
  useReportPermissions,
  useAvailableReportCategories,
  useReportSummary,
  useBatchReportOperations,
  
  // Query keys
  REPORT_QUERY_KEYS,
};
