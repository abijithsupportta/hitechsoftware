/**
 * ============================================================================
 * CSV EXPORT UTILITY
 * ============================================================================
 * 
 * ## Purpose & Business Context
 * Client-side CSV export utility for Hi Tech Software Reports module.
 * Converts array of objects to downloadable CSV files with proper formatting.
 * Handles Indian currency formatting, date formatting, and column mapping.
 * 
 * ## Export Strategy
 * - Pure JavaScript implementation - no external dependencies
 * - Browser Blob API for file creation and download
 * - Automatic CSV escaping for special characters and commas
 * - Proper Indian number formatting for monetary values
 * - Date formatting as DD/MM/YYYY for business reports
 * 
 * ## Data Handling
 * - Converts array of objects to CSV string with headers
 * - Optional header mapping for column renaming
 * - Handles null/undefined values as empty strings
 * - Formats numbers with 2 decimal places for monetary values
 * - Formats dates as DD/MM/YYYY for business standards
 * - Proper CSV escaping for commas, quotes, and newlines
 * 
 * ## Browser Compatibility
 * - Uses Blob API for modern browsers
 * - Creates temporary download link and triggers download
 * - Automatic cleanup of download link
 * - Fallback to console for unsupported browsers
 * 
 * ## Usage Examples
 * ```typescript
 * import { exportToCSV } from '@/lib/utils/csv-export';
 * 
 * const data = [
 *   { billAmount: 1500, customerName: 'John Doe', billDate: '2026-03-28' },
 *   { billAmount: 2500, customerName: 'Jane Smith', billDate: '2026-03-27' }
 * ];
 * 
 * exportToCSV(data, 'revenue-report-2026-03.csv', {
 *   'billAmount': 'Bill Amount',
 *   'customerName': 'Customer Name',
 *   'billDate': 'Bill Date'
 * });
 * ```
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2026-03-28
 * @dependencies None (pure JavaScript)
 * @relatedModules All report pages, data export components
 */

/**
 * Convert array of objects to CSV string and trigger browser download
 * 
 * @param data - Array of objects to export
 * @param filename - Name of the CSV file to download
 * @param headers - Optional mapping to rename columns
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    // Get headers from first object or use provided headers
    const dataKeys = Object.keys(data[0]);
    const headerKeys = headers ? Object.keys(headers) : dataKeys;
    const headerRow = headers 
      ? headerKeys.map(key => headers[key]).join(',')
      : dataKeys.join(',');
    
    // Convert data rows
    const csvRows: string[] = [headerRow];
    
    data.forEach((item) => {
      const row = dataKeys.map((key) => {
        const value = item[key];
        const formattedValue = formatCellValue(value);
        
        // Escape commas and quotes, and wrap in quotes if needed
        if (typeof formattedValue === 'string' && 
            (formattedValue.includes(',') || 
             formattedValue.includes('"') || 
             formattedValue.includes('\n'))) {
          return `"${formattedValue.replace(/"/g, '""')}"`;
        }
        
        return formattedValue;
      });
      csvRows.push(row.join(','));
    });
    
    // Create CSV string
    const csvString = csvRows.join('\n');
    
    // Create Blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      console.warn('Download not supported in this browser');
      console.log('CSV Data:', csvString);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
}

/**
 * Format cell value for CSV export
 * Handles Indian currency formatting, dates, and other data types
 * 
 * @param value - Value to format
 * @returns Formatted string value
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle dates - format as DD/MM/YYYY
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Handle numbers - format for currency
  if (typeof value === 'number') {
    // Check if it looks like a monetary value (has decimal places)
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
    return value.toString();
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.join('; ');
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  
  // Handle strings
  return String(value);
}

/**
 * Format number as Indian currency
 * Adds commas as per Indian numbering system
 * 
 * @param amount - Number to format
 * @returns Formatted currency string
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with 2 decimal places for CSV export
 * 
 * @param amount - Number to format
 * @returns Formatted number string
 */
export function formatDecimal(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Format date as DD/MM/YYYY for CSV export
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Export revenue data to CSV with specific formatting
 */
export function exportRevenueCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    billNumber: 'Bill Number',
    date: 'Date',
    subjectNumber: 'Subject Number',
    customerName: 'Customer Name',
    technicianName: 'Technician',
    serviceType: 'Service Type',
    billAmount: 'Bill Amount',
    gstAmount: 'GST Amount',
    netAmount: 'Net Amount',
    paymentStatus: 'Payment Status',
    paymentMode: 'Payment Mode',
    collectedAt: 'Collected At'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    billAmount: item.billAmount ? formatDecimal(Number(item.billAmount)) : '',
    gstAmount: item.gstAmount ? formatDecimal(Number(item.gstAmount)) : '',
    netAmount: item.netAmount ? formatDecimal(Number(item.netAmount)) : '',
    date: item.date && item.date !== '' ? formatDate(item.date) : '',
    collectedAt: item.collectedAt && item.collectedAt !== '' ? formatDate(item.collectedAt) : ''
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export technician data to CSV with specific formatting
 */
export function exportTechnicianCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    rank: 'Rank',
    technicianName: 'Technician Name',
    jobsDone: 'Jobs Done',
    revenueGenerated: 'Revenue Generated',
    partsSold: 'Parts Sold',
    extraPriceCollected: 'Extra Price Collected',
    amcSold: 'AMC Sold',
    commissionEarned: 'Commission Earned',
    varianceDeduction: 'Variance Deduction',
    netEarnings: 'Net Earnings',
    attendanceDays: 'Attendance Days',
    status: 'Status'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    revenueGenerated: item.revenueGenerated ? formatDecimal(Number(item.revenueGenerated)) : '',
    partsSold: item.partsSold ? formatDecimal(Number(item.partsSold)) : '',
    extraPriceCollected: item.extraPriceCollected ? formatDecimal(Number(item.extraPriceCollected)) : '',
    commissionEarned: item.commissionEarned ? formatDecimal(Number(item.commissionEarned)) : '',
    varianceDeduction: item.varianceDeduction ? formatDecimal(Number(item.varianceDeduction)) : '',
    netEarnings: item.netEarnings ? formatDecimal(Number(item.netEarnings)) : ''
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export service data to CSV with specific formatting
 */
export function exportServiceCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    subjectNumber: 'Subject Number',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    category: 'Category',
    priority: 'Priority',
    status: 'Status',
    assignedTechnician: 'Assigned Technician',
    createdDate: 'Created Date',
    completedDate: 'Completed Date',
    durationDays: 'Duration Days',
    billAmount: 'Bill Amount',
    isAMC: 'AMC',
    isWarranty: 'Warranty'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    createdDate: item.createdDate && item.createdDate !== '' ? formatDate(item.createdDate) : '',
    completedDate: item.completedDate && item.completedDate !== '' ? formatDate(item.completedDate) : '',
    durationDays: item.durationDays ? formatDecimal(Number(item.durationDays)) : '',
    billAmount: item.billAmount ? formatDecimal(Number(item.billAmount)) : '',
    isAMC: item.isAMC ? 'Yes' : 'No',
    isWarranty: item.isWarranty ? 'Yes' : 'No'
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export inventory data to CSV with specific formatting
 */
export function exportInventoryCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    materialCode: 'Material Code',
    productName: 'Product Name',
    category: 'Category',
    currentQuantity: 'Current Quantity',
    minStockLevel: 'Min Stock Level',
    wac: 'WAC',
    mrp: 'MRP',
    totalValue: 'Total Value',
    lastReceivedDate: 'Last Received Date',
    status: 'Status',
    isRefurbished: 'Refurbished'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    wac: item.wac ? formatDecimal(Number(item.wac)) : '',
    mrp: item.mrp ? formatDecimal(Number(item.mrp)) : '',
    totalValue: item.totalValue ? formatDecimal(Number(item.totalValue)) : '',
    lastReceivedDate: item.lastReceivedDate && item.lastReceivedDate !== '' ? formatDate(item.lastReceivedDate) : '',
    isRefurbished: item.isRefurbished ? 'Yes' : 'No'
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export customer data to CSV with specific formatting
 */
export function exportCustomerCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    customerName: 'Customer Name',
    phone: 'Phone',
    city: 'City',
    totalServices: 'Total Services',
    servicesThisPeriod: 'Services This Period',
    lastServiceDate: 'Last Service Date',
    totalSpent: 'Total Spent',
    dueAmount: 'Due Amount',
    hasActiveAMC: 'Active AMC',
    hasDuePayments: 'Due Payments'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    lastServiceDate: item.lastServiceDate && item.lastServiceDate !== '' ? formatDate(item.lastServiceDate) : '',
    totalSpent: item.totalSpent ? formatDecimal(Number(item.totalSpent)) : '',
    dueAmount: item.dueAmount ? formatDecimal(Number(item.dueAmount)) : '',
    hasActiveAMC: item.hasActiveAMC ? 'Yes' : 'No',
    hasDuePayments: item.hasDuePayments ? 'Yes' : 'No'
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export AMC data to CSV with specific formatting
 */
export function exportAmcCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    contractNumber: 'Contract Number',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    appliance: 'Appliance',
    brand: 'Brand',
    startDate: 'Start Date',
    endDate: 'End Date',
    duration: 'Duration',
    daysRemaining: 'Days Remaining',
    pricePaid: 'Price Paid',
    paymentMode: 'Payment Mode',
    soldBy: 'Sold By',
    commissionStatus: 'Commission Status',
    status: 'Status'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    startDate: item.startDate && item.startDate !== '' ? formatDate(item.startDate) : '',
    endDate: item.endDate && item.endDate !== '' ? formatDate(item.endDate) : '',
    pricePaid: item.pricePaid ? formatDecimal(Number(item.pricePaid)) : '',
    daysRemaining: item.daysRemaining ? formatDecimal(Number(item.daysRemaining)) : ''
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export brand/dealer data to CSV with specific formatting
 */
export function exportBrandDealerCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    name: 'Name',
    type: 'Type',
    totalServices: 'Total Services',
    totalBilled: 'Total Billed',
    totalCollected: 'Total Collected',
    totalDue: 'Total Due',
    lastInvoiceDate: 'Last Invoice Date',
    lastPaymentDate: 'Last Payment Date',
    status: 'Status'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    totalBilled: item.totalBilled ? formatDecimal(Number(item.totalBilled)) : '',
    totalCollected: item.totalCollected ? formatDecimal(Number(item.totalCollected)) : '',
    totalDue: item.totalDue ? formatDecimal(Number(item.totalDue)) : '',
    lastInvoiceDate: item.lastInvoiceDate && item.lastInvoiceDate !== '' ? formatDate(item.lastInvoiceDate) : '',
    lastPaymentDate: item.lastPaymentDate && item.lastPaymentDate !== '' ? formatDate(item.lastPaymentDate) : '',
    status: item.status ? item.status : ''
  }));
  
  exportToCSV(formattedData, filename, headers);
}

/**
 * Export financial data to CSV with specific formatting
 */
export function exportFinancialCSV(data: Record<string, unknown>[] | any[], filename: string): void {
  const headers = {
    period: 'Period',
    grossRevenue: 'Gross Revenue',
    partsCost: 'Parts Cost',
    grossProfit: 'Gross Profit',
    totalGSTCollected: 'Total GST Collected',
    totalCommissionPaid: 'Total Commission Paid',
    netProfitEstimate: 'Net Profit Estimate',
    customerDues: 'Customer Dues',
    brandDues: 'Brand Dues',
    dealerDues: 'Dealer Dues',
    totalOutstanding: 'Total Outstanding'
  };
  
  const formattedData = data.map(item => ({
    ...item,
    grossRevenue: item.grossRevenue ? formatDecimal(Number(item.grossRevenue)) : '',
    partsCost: item.partsCost ? formatDecimal(Number(item.partsCost)) : '',
    grossProfit: item.grossProfit ? formatDecimal(Number(item.grossProfit)) : '',
    totalGSTCollected: item.totalGSTCollected ? formatDecimal(Number(item.totalGSTCollected)) : '',
    totalCommissionPaid: item.totalCommissionPaid ? formatDecimal(Number(item.totalCommissionPaid)) : '',
    netProfitEstimate: item.netProfitEstimate ? formatDecimal(Number(item.netProfitEstimate)) : '',
    customerDues: item.customerDues ? formatDecimal(Number(item.customerDues)) : '',
    brandDues: item.brandDues ? formatDecimal(Number(item.brandDues)) : '',
    dealerDues: item.dealerDues ? formatDecimal(Number(item.dealerDues)) : '',
    totalOutstanding: item.totalOutstanding ? formatDecimal(Number(item.totalOutstanding)) : ''
  }));
  
  exportToCSV(formattedData, filename, headers);
}
