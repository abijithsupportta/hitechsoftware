// ═════════════════════════════════════════════════════════════════════════════
// amc.types.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC (Annual Maintenance Contract) Types for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// CORE AMC TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type AMCDurationType = '1_year' | '2_year' | '3_year' | 'custom';
export type AMCStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type AMCPaymentMode = 'cash' | 'invoice' | 'upi' | 'card';
export type AMCBilledToType = 'brand' | 'dealer';
export type AMCNotificationType = '30_days' | '15_days' | '7_days' | '1_day';
export type AMCNotificationStatus = 'sent' | 'failed';

// ═════════════════════════════════════════════════════════════════════════════
// DATABASE ENTITY TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCContract {
  id: string;
  contract_number: string;
  customer_id: string;
  subject_id: string | null;
  appliance_category_id: string;
  appliance_brand: string;
  appliance_model: string | null;
  appliance_serial_number: string | null;
  duration_type: AMCDurationType;
  start_date: string;
  end_date: string;
  status: AMCStatus;
  price_paid: number;
  payment_mode: AMCPaymentMode;
  billed_to_type: AMCBilledToType;
  billed_to_id: string | null;
  sold_by: string;
  sold_at: string;
  commission_amount: number;
  commission_set_by: string | null;
  commission_set_at: string | null;
  coverage_description: string;
  free_visits_per_year: number | null;
  parts_covered: boolean;
  parts_coverage_limit: number | null;
  brands_covered: string | null;
  exclusions: string | null;
  special_terms: string | null;
  notification_30_sent: boolean;
  notification_15_sent: boolean;
  notification_7_sent: boolean;
  notification_1_sent: boolean;
  last_notification_sent_at: string | null;
  renewal_of: string | null;
  renewed_by_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// ENRICHED TYPES WITH JOINS
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCContractWithDetails extends AMCContract {
  // Customer details
  customer_name: string;
  customer_phone: string;
  
  // Appliance category details
  appliance_category_name: string;
  
  // Sold by details
  sold_by_name: string;
  sold_by_role: string;
  
  // Billed to details
  billed_to_name: string | null;
  
  // Calculated fields
  days_until_expiry: number | null;
  is_expiring_soon: boolean;
  renewal_available: boolean;
  
  // Linked subject details
  subject_number: string | null;
}

export interface AMCListItem {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_phone: string;
  appliance_category_name: string;
  appliance_brand: string;
  start_date: string;
  end_date: string;
  status: AMCStatus;
  price_paid: number;
  payment_mode: AMCPaymentMode;
  sold_by_name: string;
  days_until_expiry: number | null;
  is_expiring_soon: boolean;
  commission_set: boolean;
  renewal_available: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface CreateAMCInput {
  customer_id: string;
  subject_id?: string;
  appliance_category_id: string;
  appliance_brand: string;
  appliance_model?: string;
  appliance_serial_number?: string;
  duration_type: AMCDurationType;
  start_date: string;
  end_date?: string; // Only for custom duration
  price_paid: number;
  payment_mode: AMCPaymentMode;
  billed_to_type: AMCBilledToType;
  billed_to_id: string;
  sold_by: string;
  coverage_description: string;
  free_visits_per_year?: number;
  parts_covered?: boolean;
  parts_coverage_limit?: number;
  brands_covered?: string;
  exclusions?: string;
  special_terms?: string;
}

export interface UpdateAMCInput {
  appliance_model?: string;
  appliance_serial_number?: string;
  coverage_description?: string;
  free_visits_per_year?: number;
  parts_covered?: boolean;
  parts_coverage_limit?: number;
  brands_covered?: string;
  exclusions?: string;
  special_terms?: string;
  renewed_by_id?: string;
}

export interface RenewAMCInput {
  duration_type: AMCDurationType;
  start_date: string;
  end_date?: string; // Only for custom duration
  price_paid: number;
  payment_mode: AMCPaymentMode;
  billed_to_type: AMCBilledToType;
  billed_to_id: string;
  sold_by: string;
  coverage_description: string;
  free_visits_per_year?: number;
  parts_covered?: boolean;
  parts_coverage_limit?: number;
  brands_covered?: string;
  exclusions?: string;
  special_terms?: string;
}

export interface CancelAMCInput {
  cancellation_reason: string;
}

export interface SetAMCCommissionInput {
  commission_amount: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// FILTER AND QUERY TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCFilters {
  customer_id?: string;
  status?: AMCStatus;
  sold_by?: string;
  expiring_within_days?: number;
  start_date?: string;
  end_date?: string;
  search?: string; // Search by contract number or customer name
  billed_to_type?: AMCBilledToType;
  duration_type?: AMCDurationType;
}

export interface AMCPaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface AMCListResponse {
  data: AMCListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCNotificationLog {
  id: string;
  amc_id: string;
  notification_type: AMCNotificationType;
  sent_at: string;
  customer_phone: string;
  message_sent: string;
  status: AMCNotificationStatus;
  fast2sms_response_id: string | null;
  failed_reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExpiringAMC {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  end_date: string;
  appliance_brand: string;
  appliance_category_name: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCDashboardSummary {
  total_active_amcs: number;
  expiring_in_30_days: number;
  expiring_in_7_days: number;
  expired_this_month: number;
  revenue_this_month: number;
  top_seller_this_month: string | null;
}

export interface AMCSalesSummary {
  total_amcs_sold: number;
  total_revenue_generated: number;
  total_commission_earned: number;
  average_amc_price: number;
  renewal_rate: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// SUBJECT INTEGRATION TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface ActiveAMCCheck {
  id: string;
  contract_number: string;
  end_date: string;
  billed_to_type: AMCBilledToType;
  billed_to_id: string;
}

export interface AMCDetectionResult {
  has_active_amc: boolean;
  amc?: ActiveAMCCheck;
  message?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type AMCResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export interface AMCCreateResponse {
  amc: AMCContractWithDetails;
  contract_number: string;
}

export interface AMCRenewalResponse {
  new_amc: AMCContractWithDetails;
  previous_amc: AMCContractWithDetails;
}

// ═════════════════════════════════════════════════════════════════════════════
// FORM TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCFormData extends CreateAMCInput {
  // Form-specific fields
  confirm_no_overlap?: boolean;
  terms_accepted?: boolean;
}

export interface AMCRenewalFormData extends RenewAMCInput {
  // Form-specific fields
  previous_amc_id: string;
  confirm_renewal_terms?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type AMCStatusColor = 
  | 'green'    // active
  | 'yellow'   // pending
  | 'gray'     // expired
  | 'red';     // cancelled

export type AMCExpiryColor =
  | 'green'    // > 30 days
  | 'yellow'   // 15-30 days
  | 'orange'   // 7-14 days
  | 'red'      // < 7 days or expired

export interface AMCContractPreview {
  contract_number: string;
  customer_name: string;
  appliance_details: string;
  duration: string;
  price: number;
  coverage_highlights: string[];
  expiry_date: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface AMCValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AMCValidationResult {
  is_valid: boolean;
  errors: AMCValidationError[];
  warnings: string[];
}
