// ═════════════════════════════════════════════════════════════════════════════
// amc.constants.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC (Annual Maintenance Contract) Constants for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// AMC DURATION OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_DURATION_OPTIONS = [
  { value: '1_year', label: '1 Year', days: 365 },
  { value: '2_year', label: '2 Years', days: 730 },
  { value: '3_year', label: '3 Years', days: 1095 },
  { value: 'custom', label: 'Custom', days: 0 }
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// AMC STATUS OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'gray' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// PAYMENT MODE OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_PAYMENT_MODE_OPTIONS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'invoice', label: 'Invoice', icon: '📄' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'card', label: 'Card', icon: '💳' }
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// BILL TO OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_BILLED_TO_OPTIONS = [
  { value: 'brand', label: 'Brand', description: 'Billed to appliance brand' },
  { value: 'dealer', label: 'Dealer', description: 'Billed to appliance dealer' }
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATION INTERVALS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_NOTIFICATION_INTERVALS = [30, 15, 7, 1] as const;

export const AMC_NOTIFICATION_TYPES = [
  { value: '30_days', label: '30 Days Before', days: 30, priority: 'low' },
  { value: '15_days', label: '15 Days Before', days: 15, priority: 'medium' },
  { value: '7_days', label: '7 Days Before', days: 7, priority: 'high' },
  { value: '1_day', label: '1 Day Before', days: 1, priority: 'urgent' }
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_WHATSAPP_TEMPLATES = {
  '30_days': `Dear [Customer Name], your AMC for [Appliance Brand] [Category] 
(Contract: [AMC Number]) expires on [End Date]. 
Renew now to continue enjoying free service. 
Call Hi Tech Engineering: [Phone Number]`,

  '15_days': `REMINDER: Dear [Customer Name], your AMC expires in 15 days 
on [End Date]. Contract: [AMC Number]. 
Don't miss out — renew today! 
Call Hi Tech Engineering: [Phone Number]`,

  '7_days': `URGENT: Dear [Customer Name], your AMC expires in just 7 days 
on [End Date]. Contract: [AMC Number]. 
Renew immediately to avoid service charges. 
Call: [Phone Number]`,

  '1_day': `FINAL REMINDER: Dear [Customer Name], your AMC expires TOMORROW 
on [End Date]. Contract: [AMC Number]. 
Call NOW to renew: [Phone Number]`
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// MESSAGE TEMPLATE FORMATTER
// ═════════════════════════════════════════════════════════════════════════════

export const formatAMCWhatsAppMessage = (
  template: keyof typeof AMC_WHATSAPP_TEMPLATES,
  variables: {
    customerName: string;
    applianceBrand: string;
    category: string;
    amcNumber: string;
    endDate: string;
    phoneNumber: string;
  }
): string => {
  const message = AMC_WHATSAPP_TEMPLATES[template];
  
  return message
    .replace('[Customer Name]', variables.customerName)
    .replace('[Appliance Brand]', variables.applianceBrand)
    .replace('[Category]', variables.category)
    .replace('[AMC Number]', variables.amcNumber)
    .replace('[End Date]', variables.endDate)
    .replace('[Phone Number]', variables.phoneNumber);
};

// ═════════════════════════════════════════════════════════════════════════════
// QUERY KEYS FOR REACT QUERY
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_QUERY_KEYS = {
  // List queries
  all: ['amc'] as const,
  lists: () => [...AMC_QUERY_KEYS.all, 'list'] as const,
  list: (filters: any) => [...AMC_QUERY_KEYS.lists(), filters] as const,
  
  // Single queries
  details: () => [...AMC_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...AMC_QUERY_KEYS.details(), id] as const,
  
  // Customer AMCs
  customerAMCs: (customerId: string) => [...AMC_QUERY_KEYS.all, 'customer', customerId] as const,
  
  // Expiring AMCs
  expiring: (days: number) => [...AMC_QUERY_KEYS.all, 'expiring', days] as const,
  
  // Dashboard
  dashboard: () => [...AMC_QUERY_KEYS.all, 'dashboard'] as const,
  
  // Sales summary
  salesSummary: (technicianId?: string, period?: string) => 
    [...AMC_QUERY_KEYS.all, 'sales-summary', technicianId, period] as const,
  
  // Active AMC check
  activeAMC: (customerId: string, categoryId: string, brand: string) => 
    [...AMC_QUERY_KEYS.all, 'active', customerId, categoryId, brand] as const
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// EXPIRY COLOR CODING
// ═════════════════════════════════════════════════════════════════════════════

export const getAMCExpiryColor = (daysUntilExpiry: number | null): string => {
  if (daysUntilExpiry === null) return 'gray';
  if (daysUntilExpiry < 0) return 'red';
  if (daysUntilExpiry <= 7) return 'red';
  if (daysUntilExpiry <= 15) return 'orange';
  if (daysUntilExpiry <= 30) return 'yellow';
  return 'green';
};

export const getAMCStatusColor = (status: string): string => {
  const statusOption = AMC_STATUS_OPTIONS.find(opt => opt.value === status);
  return statusOption?.color || 'gray';
};

// ═════════════════════════════════════════════════════════════════════════════
// DURATION CALCULATION HELPERS
// ═════════════════════════════════════════════════════════════════════════════

export const calculateDurationInDays = (durationType: string): number => {
  const option = AMC_DURATION_OPTIONS.find(opt => opt.value === durationType);
  return option?.days || 0;
};

export const formatDurationDisplay = (durationType: string, startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (durationType === 'custom') {
    return `Custom: ${days} days`;
  }
  
  const option = AMC_DURATION_OPTIONS.find(opt => opt.value === durationType);
  return option?.label || `${days} days`;
};

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_VALIDATION = {
  MIN_COVERAGE_DESCRIPTION_LENGTH: 20,
  MAX_COVERAGE_DESCRIPTION_LENGTH: 2000,
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99,
  MIN_FREE_VISITS: 1,
  MAX_FREE_VISITS: 365,
  MAX_PARTS_COVERAGE_LIMIT: 999999.99,
  DEFAULT_FREE_VISITS_PER_YEAR: 2,
  DEFAULT_PARTS_COVERAGE_LIMIT: 5000
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_ERROR_CODES = {
  OVERLAPPING_AMC: 'OVERLAPPING_AMC',
  INVALID_DURATION: 'INVALID_DURATION',
  INVALID_PRICE: 'INVALID_PRICE',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  INVALID_APPLIANCE: 'INVALID_APPLIANCE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AMC_NOT_FOUND: 'AMC_NOT_FOUND',
  CANNOT_RENEW: 'CANNOT_RENEW',
  CANNOT_CANCEL: 'CANNOT_CANCEL',
  COMMISSION_ALREADY_SET: 'COMMISSION_ALREADY_SET',
  WHATSAPP_SEND_FAILED: 'WHATSAPP_SEND_FAILED'
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SUCCESS MESSAGES
// ═════════════════════════════════════════════════════════════════════════════

export const AMC_SUCCESS_MESSAGES = {
  CREATED: 'AMC contract created successfully',
  UPDATED: 'AMC contract updated successfully',
  RENEWED: 'AMC contract renewed successfully',
  CANCELLED: 'AMC contract cancelled successfully',
  COMMISSION_SET: 'Commission set successfully',
  NOTIFICATION_SENT: 'WhatsApp notification sent successfully',
  BULK_NOTIFICATIONS_SENT: 'Bulk WhatsApp notifications sent successfully'
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// HI TECH ENGINEERING CONTACT
// ═════════════════════════════════════════════════════════════════════════════

export const HI_TECH_CONTACT = {
  PHONE_NUMBER: '+91 85903 77418',
  EMAIL: 'support@hitechengineering.com',
  ADDRESS: '3rd Floor CSI Complex, Kottayam, Kerala'
} as const;
