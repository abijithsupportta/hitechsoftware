import { z } from 'zod';

// ============================================================================
// CUSTOMER PAYMENT TRACKING TYPES
// ============================================================================

// Payment collection status
export const paymentCollectionStatusSchema = z.enum(['collected', 'uncollected']);

// Payment collection method
export const paymentCollectionMethodSchema = z.enum([
  'cash',
  'upi', 
  'bank_transfer',
  'card',
  'cheque',
  'other'
]);

// Base payment collection info
export const paymentCollectionSchema = z.object({
  payment_collected: z.boolean(),
  payment_collected_at: z.string().datetime().nullable(),
  payment_collected_by: z.string().uuid().nullable(),
  collection_notes: z.string().nullable(),
  collection_method: paymentCollectionMethodSchema.optional(),
});

// Due payment item from view
export const duePaymentSchema = z.object({
  // Bill Information
  bill_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  total_amount: z.number().positive(),
  payment_status: z.enum(['due', 'paid', 'partial']),
  payment_collected: z.boolean(),
  payment_collected_at: z.string().datetime().nullable(),
  payment_collected_by: z.string().uuid().nullable(),
  collection_notes: z.string().nullable(),
  bill_created_at: z.string().datetime(),
  
  // Subject Information
  subject_number: z.string(),
  service_completed_at: z.string().datetime().nullable(),
  subject_status: z.enum([
    'pending', 'allocated', 'accepted', 'in_progress', 
    'completed', 'incomplete', 'awaiting_parts', 'reschedule'
  ]),
  
  // Customer Information
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().nullable(),
  customer_address: z.string().nullable(),
  customer_city: z.string().nullable(),
  customer_state: z.string().nullable(),
  customer_pincode: z.string().nullable(),
  
  // Technician Information
  technician_id: z.string().uuid().nullable(),
  technician_name: z.string().nullable(),
  technician_phone: z.string().nullable(),
  
  // Calculated Fields
  days_since_service: z.number().nullable(),
  is_overdue: z.boolean(),
  priority_level: z.number().min(1).max(5), // 1=Critical, 5=Not applicable
});

// Payment collection form data
export const paymentCollectionFormSchema = z.object({
  bill_id: z.string().uuid(),
  payment_collected: z.literal(true),
  collection_method: paymentCollectionMethodSchema,
  collection_notes: z.string().optional(),
  payment_amount: z.number().positive().optional(), // For partial payments
});

// Payment collection API payload
export const paymentCollectionPayloadSchema = paymentCollectionFormSchema.extend({
  payment_collected_at: z.string().datetime().optional(), // Can be set by server
});

// ============================================================================
// DUE PAYMENTS DASHBOARD TYPES
// ============================================================================

// Dashboard summary statistics
export const duePaymentsSummarySchema = z.object({
  total_due_amount: z.number(),
  total_due_count: z.number(),
  overdue_count: z.number(),
  overdue_amount: z.number(),
  critical_count: z.number(), // 30+ days overdue
  high_count: z.number(),     // 14-30 days overdue
  medium_count: z.number(),   // 7-14 days overdue
  low_count: z.number(),      // 0-7 days overdue
});

// Filter options for due payments
export const duePaymentsFilterSchema = z.object({
  technician_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  amount_from: z.number().positive().optional(),
  amount_to: z.number().positive().optional(),
  overdue_only: z.boolean().optional(),
  priority_level: z.number().min(1).max(4).optional(), // 1-4 (exclude 5=not applicable)
  customer_search: z.string().optional(),
});

// Sort options
export const duePaymentsSortSchema = z.object({
  field: z.enum([
    'service_completed_at', 
    'days_since_service', 
    'total_amount', 
    'customer_name',
    'priority_level'
  ]),
  direction: z.enum(['asc', 'desc']),
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

// API Response wrapper
export const apiResponseSchema = z.object({
  data: z.any(),
  error: z.any().nullable(),
  message: z.string().optional(),
});

// Paginated response
export const paginatedResponseSchema = z.object({
  data: z.array(duePaymentSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type PaymentCollectionStatus = z.infer<typeof paymentCollectionStatusSchema>;
export type PaymentCollectionMethod = z.infer<typeof paymentCollectionMethodSchema>;
export type PaymentCollection = z.infer<typeof paymentCollectionSchema>;
export type DuePayment = z.infer<typeof duePaymentSchema>;
export type PaymentCollectionForm = z.infer<typeof paymentCollectionFormSchema>;
export type PaymentCollectionPayload = z.infer<typeof paymentCollectionPayloadSchema>;
export type DuePaymentsSummary = z.infer<typeof duePaymentsSummarySchema>;
export type DuePaymentsFilter = z.infer<typeof duePaymentsFilterSchema>;
export type DuePaymentsSort = z.infer<typeof duePaymentsSortSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type PaginatedResponse = z.infer<typeof paginatedResponseSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_COLLECTION_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'cheque', label: 'Cheque', icon: '📄' },
  { value: 'other', label: 'Other', icon: '📝' },
] as const;

export const PRIORITY_LEVELS = [
  { value: 1, label: 'Critical', color: 'red', description: '30+ days overdue' },
  { value: 2, label: 'High', color: 'orange', description: '14-30 days overdue' },
  { value: 3, label: 'Medium', color: 'yellow', description: '7-14 days overdue' },
  { value: 4, label: 'Low', color: 'blue', description: '0-7 days overdue' },
] as const;

export const OVERDUE_THRESHOLDS = {
  CRITICAL: 30, // 30+ days
  HIGH: 14,    // 14-30 days
  MEDIUM: 7,   // 7-14 days
  LOW: 0,      // 0-7 days
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaymentCollectionHistory {
  bill_id: string;
  collected_at: string;
  collected_by: string;
  collected_by_name: string;
  amount: number;
  method: PaymentCollectionMethod;
  notes?: string;
}

export interface DuePaymentActions {
  collectPayment: (billId: string, data: PaymentCollectionForm) => Promise<void>;
  viewCustomer: (customerId: string) => void;
  viewSubject: (subjectId: string) => void;
  callCustomer: (phone: string) => void;
  messageCustomer: (phone: string) => void;
}

export interface DuePaymentCardProps {
  payment: DuePayment;
  actions: DuePaymentActions;
  loading?: boolean;
}

export interface PaymentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentCollectionForm) => void;
  payment: DuePayment;
  loading?: boolean;
}
