/**
 * ============================================================================
 * REPORTS MODULE - Constants and Configuration
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * Centralized constants for the Hi Tech Software Reports module.
 * Provides configuration for report categories, time periods, chart settings,
 * export options, and role-based access control.
 * 
 * ## Report Categories Configuration
 * Defines all available report types with their metadata, permissions,
 * and default settings. Each category includes navigation, display, and
 * access control information.
 * 
 * ## Time Periods and Date Ranges
 * Standardized time period definitions for consistent reporting across
 * all modules. Includes preset date ranges and period aggregation logic.
 * 
 * ## Chart and Visualization Settings
 * Default chart configurations, color schemes, and formatting options
 * for consistent data visualization across all reports.
 * 
 * ## Export Configuration
 * Standardized export settings for PDF, Excel, and CSV formats.
 * Includes templates, layouts, and quality settings.
 * 
 * ## Role-Based Access Control
 * Permission matrix defining which roles can access which report
 * categories and perform specific actions (view, export, etc.).
 * 
 * ## Dependencies & Integration
 * - React Query for caching and stale time configuration
 * - Chart.js for default chart settings
 * - @react-pdf/renderer for PDF export settings
 * - Date utilities for time period calculations
 * 
 * ## Business Rules & Logic
 * - All monetary values formatted in Indian Rupees
 * - Date handling in UTC with timezone conversion
 * - Hierarchical permission model (super_admin > office_staff > stock_manager > technician)
 * - Cache duration based on report complexity and data freshness requirements
 * 
 * ## Usage Examples
 * ```typescript
 * // Get report category configuration
 * const revenueConfig = REPORT_CATEGORIES.REVENUE;
 * 
 * // Get time period preset
 * const thisMonth = TIME_PERIODS.THIS_MONTH;
 * 
 * // Check role permissions
 * const canView = hasReportPermission(userRole, 'financial');
 * ```
 * 
 * ## Performance & Optimization
 * - Cache durations optimized for report complexity
 * - Lazy loading configuration for large datasets
 * - Pagination defaults for optimal performance
 * - Export size limits to prevent memory issues
 * 
 * ## Security & Compliance
 * - Role-based access control enforcement
 * - Data export restrictions for sensitive reports
 * - Audit trail configuration
 * - PII protection in customer reports
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies react-query, chart.js, date-fns
 * @relatedModules reports.types.ts, reports.service.ts, useReports.ts
 */

// ============================================================================
// REPORT CATEGORIES CONFIGURATION
// ============================================================================

/**
 * Report categories with metadata and configuration
 */
export const REPORT_CATEGORIES = {
  REVENUE: {
    id: 'revenue' as const,
    name: 'Revenue Reports',
    description: 'Financial performance, billing analysis, and payment tracking',
    icon: 'DollarSign',
    color: '#10b981',
    allowedRoles: ['super_admin', 'office_staff'],
    defaultPeriod: 'monthly',
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'paymentMode', 'paymentStatus', 'brand', 'dealer'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/revenue',
      order: 1,
    },
  },
  TECHNICIAN: {
    id: 'technician' as const,
    name: 'Technician Reports',
    description: 'Technician performance, earnings, and attendance analytics',
    icon: 'Users',
    color: '#3b82f6',
    allowedRoles: ['super_admin', 'office_staff', 'technician'],
    defaultPeriod: 'monthly',
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'technician', 'status', 'performance'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/technicians',
      order: 2,
    },
  },
  SERVICE: {
    id: 'service' as const,
    name: 'Service Reports',
    description: 'Job completion, turnaround time, and service metrics',
    icon: 'ClipboardList',
    color: '#f59e0b',
    allowedRoles: ['super_admin', 'office_staff'],
    defaultPeriod: 'monthly',
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'status', 'priority', 'category', 'brand'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/services',
      order: 3,
    },
  },
  INVENTORY: {
    id: 'inventory' as const,
    name: 'Inventory Reports',
    description: 'Stock levels, movement, valuation, and supplier analysis',
    icon: 'Package',
    color: '#8b5cf6',
    allowedRoles: ['super_admin', 'office_staff', 'stock_manager'],
    defaultPeriod: 'monthly',
    cacheDuration: 15 * 60 * 1000, // 15 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'category', 'productType', 'supplier', 'stockStatus'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/inventory',
      order: 4,
    },
  },
  CUSTOMER: {
    id: 'customer' as const,
    name: 'Customer Reports',
    description: 'Customer demographics, service history, and tier analysis',
    icon: 'UserCog',
    color: '#ec4899',
    allowedRoles: ['super_admin', 'office_staff'],
    defaultPeriod: 'monthly',
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'city', 'state', 'customerTier', 'amcStatus'],
      drillDown: true,
      anonymize: true, // PII protection
    },
    navigation: {
      path: '/dashboard/reports/customers',
      order: 5,
    },
  },
  FINANCIAL: {
    id: 'financial' as const,
    name: 'Financial Reports',
    description: 'P&L statements, cash flow, and financial health analysis',
    icon: 'TrendingUp',
    color: '#ef4444',
    allowedRoles: ['super_admin'], // Restricted access
    defaultPeriod: 'monthly',
    cacheDuration: 20 * 60 * 1000, // 20 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'period'],
      drillDown: true,
      sensitive: true,
    },
    navigation: {
      path: '/dashboard/reports/financial',
      order: 6,
    },
  },
  SUPPLIER: {
    id: 'supplier' as const,
    name: 'Supplier Reports',
    description: 'Supplier performance, purchase analysis, and reliability metrics',
    icon: 'Truck',
    color: '#06b6d4',
    allowedRoles: ['super_admin', 'office_staff', 'stock_manager'],
    defaultPeriod: 'monthly',
    cacheDuration: 30 * 60 * 1000, // 30 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'supplier', 'category', 'performance'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/suppliers',
      order: 7,
    },
  },
  REGIONAL: {
    id: 'regional' as const,
    name: 'Regional Reports',
    description: 'Location-based service and revenue analysis',
    icon: 'MapPin',
    color: '#84cc16',
    allowedRoles: ['super_admin', 'office_staff'],
    defaultPeriod: 'monthly',
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    features: {
      export: true,
      charts: true,
      filters: ['dateRange', 'city', 'state', 'region'],
      drillDown: true,
    },
    navigation: {
      path: '/dashboard/reports/regional',
      order: 8,
    },
  },
} as const;

// ============================================================================
// TIME PERIODS CONFIGURATION
// ============================================================================

/**
 * Time period definitions with date calculations
 */
export const TIME_PERIODS = {
  TODAY: {
    id: 'today' as const,
    label: 'Today',
    getDateRange: () => {
      const today = new Date();
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  YESTERDAY: {
    id: 'yesterday' as const,
    label: 'Yesterday',
    getDateRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0],
      };
    },
  },
  THIS_WEEK: {
    id: 'this_week' as const,
    label: 'This Week',
    getDateRange: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  LAST_WEEK: {
    id: 'last_week' as const,
    label: 'Last Week',
    getDateRange: () => {
      const today = new Date();
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        start: startOfLastWeek.toISOString().split('T')[0],
        end: endOfLastWeek.toISOString().split('T')[0],
      };
    },
  },
  THIS_MONTH: {
    id: 'this_month' as const,
    label: 'This Month',
    getDateRange: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  LAST_MONTH: {
    id: 'last_month' as const,
    label: 'Last Month',
    getDateRange: () => {
      const today = new Date();
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: startOfLastMonth.toISOString().split('T')[0],
        end: endOfLastMonth.toISOString().split('T')[0],
      };
    },
  },
  THIS_QUARTER: {
    id: 'this_quarter' as const,
    label: 'This Quarter',
    getDateRange: () => {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        start: startOfQuarter.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  LAST_QUARTER: {
    id: 'last_quarter' as const,
    label: 'Last Quarter',
    getDateRange: () => {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfLastQuarter = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const endOfLastQuarter = new Date(today.getFullYear(), quarter * 3, 0);
      return {
        start: startOfLastQuarter.toISOString().split('T')[0],
        end: endOfLastQuarter.toISOString().split('T')[0],
      };
    },
  },
  THIS_YEAR: {
    id: 'this_year' as const,
    label: 'This Year',
    getDateRange: () => {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        start: startOfYear.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  LAST_YEAR: {
    id: 'last_year' as const,
    label: 'Last Year',
    getDateRange: () => {
      const today = new Date();
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
      return {
        start: startOfLastYear.toISOString().split('T')[0],
        end: endOfLastYear.toISOString().split('T')[0],
      };
    },
  },
  CUSTOM: {
    id: 'custom' as const,
    label: 'Custom Range',
    getDateRange: () => ({ start: '', end: '' }),
  },
} as const;

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

/**
 * Default chart settings and color schemes
 */
export const CHART_CONFIG = {
  DEFAULT_HEIGHT: 400,
  DEFAULT_COLORS: [
    '#10b981', // emerald-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ],
  FORMATTERS: {
    CURRENCY: {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    PERCENTAGE: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    },
    NUMBER: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  },
  GRID: {
    display: true,
    drawBorder: false,
    color: 'rgba(156, 163, 175, 0.3)',
  },
  LEGEND: {
    display: true,
    position: 'top' as const,
    align: 'end' as const,
  },
} as const;

/**
 * Chart type configurations
 */
export const CHART_TYPES = {
  LINE: {
    type: 'line' as const,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: CHART_CONFIG.GRID,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: CHART_CONFIG.LEGEND,
      },
    },
  },
  BAR: {
    type: 'bar' as const,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: CHART_CONFIG.GRID,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: CHART_CONFIG.LEGEND,
      },
    },
  },
  PIE: {
    type: 'pie' as const,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          ...CHART_CONFIG.LEGEND,
          position: 'right' as const,
        },
      },
    },
  },
  AREA: {
    type: 'line' as const,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      fill: true,
      scales: {
        y: {
          beginAtZero: true,
          grid: CHART_CONFIG.GRID,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: CHART_CONFIG.LEGEND,
      },
    },
  },
} as const;

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

/**
 * Export settings and limits
 */
export const EXPORT_CONFIG = {
  MAX_ROWS: 10000,
  MAX_FILE_SIZE_MB: 50,
  SUPPORTED_FORMATS: ['pdf', 'excel', 'csv'] as const,
  PDF: {
    ORIENTATION: 'portrait' as const,
    UNIT: 'mm' as const,
    SIZE: 'a4' as const,
    MARGINS: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
    FONTS: {
      title: 16,
      heading: 14,
      body: 10,
      footer: 8,
    },
    COLORS: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#3b82f6',
      border: '#e5e7eb',
    },
  },
  EXCEL: {
    WORKSHEET_NAME: 'Report Data',
    HEADER_STYLE: {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FFE5B4' } },
    },
    NUMBER_FORMAT: {
      currency: '₹#,##0.00',
      percentage: '0.00%',
      number: '#,##0.00',
    },
  },
  CSV: {
    DELIMITER: ',',
    QUOTE_CHARACTER: '"',
    ESCAPE_CHARACTER: '"',
    LINE_TERMINATOR: '\n',
  },
} as const;

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Permission matrix for report access
 */
export const REPORT_PERMISSIONS = {
  super_admin: {
    canAccess: ['revenue', 'technician', 'service', 'inventory', 'customer', 'financial', 'supplier', 'regional'] as string[],
    canExport: ['revenue', 'technician', 'service', 'inventory', 'customer', 'financial', 'supplier', 'regional'] as string[],
    canDrillDown: ['revenue', 'technician', 'service', 'inventory', 'customer', 'financial', 'supplier', 'regional'] as string[],
    canViewSensitive: ['financial', 'customer'] as string[],
  },
  office_staff: {
    canAccess: ['revenue', 'technician', 'service', 'inventory', 'customer', 'supplier', 'regional'] as string[],
    canExport: ['revenue', 'technician', 'service', 'inventory', 'customer', 'supplier', 'regional'] as string[],
    canDrillDown: ['revenue', 'technician', 'service', 'inventory', 'customer', 'supplier', 'regional'] as string[],
    canViewSensitive: ['customer'] as string[],
  },
  stock_manager: {
    canAccess: ['inventory', 'supplier'] as string[],
    canExport: ['inventory', 'supplier'] as string[],
    canDrillDown: ['inventory', 'supplier'] as string[],
    canViewSensitive: [] as string[],
  },
  technician: {
    canAccess: ['technician'] as string[],
    canExport: ['technician'] as string[],
    canDrillDown: ['technician'] as string[],
    canViewSensitive: [] as string[],
    // Technicians can only view their own data
    dataScope: 'own',
  },
} as const;

/**
 * Check if role has permission for report category
 */
export function hasReportPermission(role: string, category: string, action: 'access' | 'export' | 'drillDown' = 'access'): boolean {
  const rolePermissions = REPORT_PERMISSIONS[role as keyof typeof REPORT_PERMISSIONS];
  if (!rolePermissions) return false;
  
  const permissionKey = `can${action.charAt(0).toUpperCase() + action.slice(1)}` as keyof typeof rolePermissions;
  const permissions = rolePermissions[permissionKey] as string[];
  
  return permissions.includes(category);
}

/**
 * Check if role can view sensitive data
 */
export function canViewSensitiveData(role: string): boolean {
  const rolePermissions = REPORT_PERMISSIONS[role as keyof typeof REPORT_PERMISSIONS];
  return rolePermissions?.canViewSensitive?.length > 0 || false;
}

// ============================================================================
// QUERY CONFIGURATION
// ============================================================================

/**
 * React Query configuration for reports
 */
export const QUERY_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  RETRY_COUNT: 3,
  REFETCH_ON_WINDOW_FOCUS: false,
  REFETCH_ON_RECONNECT: true,
} as const;

/**
 * Category-specific cache durations
 */
export const CACHE_DURATIONS = {
  revenue: 5 * 60 * 1000, // 5 minutes
  technician: 10 * 60 * 1000, // 10 minutes
  service: 5 * 60 * 1000, // 5 minutes
  inventory: 15 * 60 * 1000, // 15 minutes
  customer: 10 * 60 * 1000, // 10 minutes
  financial: 20 * 60 * 1000, // 20 minutes
  supplier: 30 * 60 * 1000, // 30 minutes
  regional: 10 * 60 * 1000, // 10 minutes
} as const;

// ============================================================================
// FILTER OPTIONS
// ============================================================================

/**
 * Available filter options by category
 */
export const FILTER_OPTIONS = {
  PAYMENT_MODES: ['cash', 'upi', 'card', 'bank_transfer'],
  PAYMENT_STATUSES: ['paid', 'due', 'partially_paid'],
  SERVICE_STATUSES: ['pending', 'allocated', 'accepted', 'arrived', 'in_progress', 'completed', 'incomplete', 'cancelled'],
  PRIORITIES: ['low', 'medium', 'high', 'urgent'],
  CUSTOMER_TIERS: ['High Value', 'Medium Value', 'Low Value', 'New'],
  STOCK_STATUSES: ['Out of Stock', 'Critical', 'Low', 'Medium', 'Adequate'],
  SUPPLIER_TIERS: ['High Volume', 'Medium Volume', 'Low Volume', 'Inactive'],
  PERFORMANCE_RATINGS: ['Excellent', 'Good', 'Average', 'Poor'],
} as const;

// ============================================================================
// PAGINATION CONFIGURATION
// ============================================================================

/**
 * Pagination settings
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  DEFAULT_PAGE: 1,
} as const;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Validation rules and limits
 */
export const VALIDATION_CONFIG = {
  DATE_RANGE: {
    MAX_DAYS: 365, // Maximum 1 year for performance
    MIN_DAYS: 1,
  },
  EXPORT: {
    MAX_ROWS: EXPORT_CONFIG.MAX_ROWS,
    MAX_FILE_SIZE: EXPORT_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert to bytes
  },
  FILTERS: {
    MAX_SELECTED_ITEMS: 50, // Maximum items in multi-select filters
  },
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Standardized error messages
 */
export const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'You do not have permission to access this report',
  DATA_NOT_FOUND: 'No data found for the selected criteria',
  EXPORT_FAILED: 'Failed to export report. Please try again',
  INVALID_DATE_RANGE: 'Invalid date range. Please check your selection',
  FILE_TOO_LARGE: 'Export file is too large. Please reduce the date range or filters',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  SERVER_ERROR: 'Server error. Please try again later',
  VALIDATION_ERROR: 'Invalid input. Please check your selections',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

/**
 * Standardized success messages
 */
export const SUCCESS_MESSAGES = {
  REPORT_GENERATED: 'Report generated successfully',
  EXPORT_COMPLETED: 'Report exported successfully',
  DATA_REFRESHED: 'Report data refreshed',
  FILTERS_APPLIED: 'Filters applied successfully',
  REPORT_SAVED: 'Report saved successfully',
} as const;
