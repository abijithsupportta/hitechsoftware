import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DuePayment, 
  PaymentCollectionForm, 
  PaymentCollectionPayload,
  DuePaymentsSummary,
  DuePaymentsFilter,
  DuePaymentsSort,
  PaginatedResponse 
} from '../../modules/payment-tracking/payment-tracking.types';
import { getPaymentTrackingService } from '../../modules/payment-tracking/payment-tracking.service';
import { createClient } from '../../lib/supabase/client';

// ============================================================================
// PAYMENT TRACKING REACT QUERY HOOKS
// ============================================================================

const supabase = createClient();
const paymentTrackingService = getPaymentTrackingService(supabase);

// ============================================================================
// DUE PAYMENTS HOOKS
// ============================================================================

/**
 * Hook to fetch due payments summary statistics
 */
export function useDuePaymentsSummary() {
  return useQuery({
    queryKey: ['due-payments-summary'],
    queryFn: () => paymentTrackingService.getDuePaymentsSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
}

/**
 * Hook to fetch paginated due payments with filters
 */
export function useDuePayments(
  filter: DuePaymentsFilter = {},
  sort: DuePaymentsSort = { field: 'service_completed_at', direction: 'desc' },
  page: number = 1,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['due-payments', filter, sort, page, limit],
    queryFn: () => paymentTrackingService.getDuePayments(filter, sort, page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch single due payment by ID
 */
export function useDuePayment(billId: string) {
  return useQuery({
    queryKey: ['due-payment', billId],
    queryFn: () => paymentTrackingService.getDuePayment(billId),
    enabled: !!billId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// PAYMENT COLLECTION HOOKS
// ============================================================================

/**
 * Hook to record payment collection for a single bill
 */
export function useRecordPaymentCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PaymentCollectionPayload) => 
      paymentTrackingService.recordPaymentCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-payments'] });
      queryClient.invalidateQueries({ queryKey: ['due-payments-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-collection-stats'] });
    },
  });
}

/**
 * Hook to record bulk payment collection for multiple bills
 */
export function useRecordBulkPaymentCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ billIds, data }: { billIds: string[]; data: Omit<PaymentCollectionPayload, 'bill_id'> }) => 
      paymentTrackingService.recordBulkPaymentCollection(billIds, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-payments'] });
      queryClient.invalidateQueries({ queryKey: ['due-payments-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-collection-stats'] });
    },
  });
}

/**
 * Hook to update payment collection notes
 */
export function useUpdatePaymentCollectionNotes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ billId, notes }: { billId: string; notes: string }) => 
      paymentTrackingService.updatePaymentCollectionNotes(billId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-payment'] });
      queryClient.invalidateQueries({ queryKey: ['due-payments'] });
    },
  });
}

// ============================================================================
// REPORTS AND HISTORY HOOKS
// ============================================================================

/**
 * Hook to fetch technician payment collection history
 */
export function useTechnicianPaymentHistory(
  technicianId: string,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: ['technician-payment-history', technicianId, dateFrom, dateTo],
    queryFn: () => paymentTrackingService.getTechnicianPaymentHistory(technicianId, dateFrom, dateTo),
    enabled: !!technicianId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch daily payment collection report
 */
export function useDailyPaymentCollectionReport(date: string) {
  return useQuery({
    queryKey: ['daily-payment-report', date],
    queryFn: () => paymentTrackingService.getDailyPaymentCollectionReport(date, date),
    enabled: !!date,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch payment collection statistics
 */
export function usePaymentCollectionStats(
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: ['payment-collection-stats', dateFrom, dateTo],
    queryFn: () => paymentTrackingService.getPaymentCollectionStats(dateFrom, dateTo),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if current user can collect payment
 */
export function useCanCollectPayment(billId: string) {
  return useQuery({
    queryKey: ['can-collect-payment', billId],
    queryFn: () => paymentTrackingService.canCollectPayment(billId),
    enabled: !!billId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get payment collection form with validation
 */
export function usePaymentCollectionForm(billId: string) {
  const { data: duePayment, ...rest } = useDuePayment(billId);
  const { data: canCollect } = useCanCollectPayment(billId);
  
  return {
    duePayment,
    canCollect,
    ...rest,
  };
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Hook to fetch all data needed for due payments dashboard
 */
export function useDuePaymentsDashboard(filter: DuePaymentsFilter = {}) {
  const summary = useDuePaymentsSummary();
  const payments = useDuePayments(filter);
  const stats = usePaymentCollectionStats();
  
  return {
    summary,
    payments,
    stats,
    isLoading: summary.isLoading || payments.isLoading || stats.isLoading,
    isError: summary.isError || payments.isError || stats.isError,
  };
}

/**
 * Hook for payment collection workflow
 */
export function usePaymentCollectionWorkflow() {
  const queryClient = useQueryClient();
  
  const recordPayment = useRecordPaymentCollection();
  const recordBulkPayment = useRecordBulkPaymentCollection();
  const updateNotes = useUpdatePaymentCollectionNotes();
  
  const invalidatePaymentTracking = () => {
    queryClient.invalidateQueries({ queryKey: ['due-payments'] });
    queryClient.invalidateQueries({ queryKey: ['due-payments-summary'] });
    queryClient.invalidateQueries({ queryKey: ['payment-collection-stats'] });
  };
  
  return {
    recordPayment,
    recordBulkPayment,
    updateNotes,
    invalidatePaymentTracking,
    isLoading: recordPayment.isPending || recordBulkPayment.isPending || updateNotes.isPending,
  };
}

// ============================================================================
// CACHE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook to invalidate all payment tracking queries
 */
export function useInvalidatePaymentTracking() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['due-payments'] });
    queryClient.invalidateQueries({ queryKey: ['due-payments-summary'] });
    queryClient.invalidateQueries({ queryKey: ['due-payment'] });
    queryClient.invalidateQueries({ queryKey: ['payment-collection-stats'] });
    queryClient.invalidateQueries({ queryKey: ['technician-payment-history'] });
    queryClient.invalidateQueries({ queryKey: ['daily-payment-report'] });
  };
}

/**
 * Hook to prefetch next page of due payments
 */
export function usePrefetchDuePayments() {
  const queryClient = useQueryClient();
  
  return (filter: DuePaymentsFilter, sort: DuePaymentsSort, page: number, limit: number) => {
    queryClient.prefetchQuery({
      queryKey: ['due-payments', filter, sort, page + 1, limit],
      queryFn: () => paymentTrackingService.getDuePayments(filter, sort, page + 1, limit),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };
}

// Re-export types and constants
export type {
  DuePayment,
  PaymentCollectionForm,
  PaymentCollectionPayload,
  DuePaymentsSummary,
  DuePaymentsFilter,
  DuePaymentsSort,
  PaginatedResponse,
} from '../../modules/payment-tracking/payment-tracking.types';

export { PRIORITY_LEVELS, PAYMENT_COLLECTION_METHODS } from '../../modules/payment-tracking/payment-tracking.types';
