// ─────────────────────────────────────────────────────────────────────────────
// useBilling.ts
//
// React Query hooks for the BillingSection of the Subject Detail page.
// All mutations call the /api/subjects/[id]/billing and /api/bills/* routes
// (server-side) rather than the billing service directly, because the service
// layer needs the admin Supabase client for subject ownership verification.
//
// React Query keys used:
//   ['subject-accessories', subjectId] — accessory list
//   ['subject-bill', subjectId]        — bill record
//   SUBJECT_QUERY_KEYS.detail(id)      — full subject detail (invalidated after
//                                        bill generation so charge fields update)
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import {
  getAccessoriesBySubject,
  getBillBySubject,
} from '@/modules/subjects/billing.service';
import type { AddAccessoryInput, EditBillInput, GenerateBillInput } from '@/modules/subjects/subject.types';

/**
 * Fetches all spare-part/accessory rows for a subject.
 * Returns { items, total } where total is the summed accessories_total.
 */
export function useSubjectAccessories(subjectId: string) {
  return useQuery({
    queryKey: ['subject-accessories', subjectId],
    queryFn: async () => {
      const result = await getAccessoriesBySubject(subjectId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(subjectId),
  });
}

/** Mutation that adds a single accessory via the billing API POST action. */
export function useAddAccessory(subjectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddAccessoryInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/subjects/${subjectId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_accessory', ...input }),
      });
      
      const json = await res.json() as { 
        ok: boolean
        data?: { id: string; item_name: string; quantity: number; unit_price: number }
        error?: { userMessage: string }
      };
      
      if (!json.ok) throw new Error(json.error?.userMessage ?? 'Failed to add accessory');
      return json.data!;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', subjectId] });
      toast.success(`${item.item_name} added`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/** Mutation that removes an accessory by ID via the billing API DELETE. */
export function useRemoveAccessory(subjectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (accessoryId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/subjects/${subjectId}/billing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_accessory', accessoryId }),
      });
      
      const json = await res.json() as { 
        ok: boolean
        error?: { userMessage: string }
      };
      
      if (!json.ok) throw new Error(json.error?.userMessage ?? 'Failed to remove accessory');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', subjectId] });
      toast.success('Accessory removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/**
 * Mutation that triggers full bill generation via the billing API POST.
 * On success, invalidates the detail, list, accessories, and bill queries
 * so every section of the Subject Detail page refreshes simultaneously.
 * Toast: 'Bill generated and job completed successfully'
 */
export function useGenerateBill(subjectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: GenerateBillInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/subjects/${subjectId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_bill', ...input }),
      });
      
      const json = await res.json() as { 
        ok: boolean
        data?: { id: string; bill_number: string; bill_type: string; grand_total: number }
        error?: { userMessage: string }
      };
      
      if (!json.ok) throw new Error(json.error?.userMessage ?? 'Failed to generate bill');
      return json.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject-bill', subjectId] });
      toast.success('Bill generated and job completed successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/**
 * Fetches the bill record for a subject.
 * Returns null (instead of throwing) when no bill has been generated yet,
 * so the BillingSection can render the generation form instead of an error.
 */
export function useSubjectBill(subjectId: string) {
  return useQuery({
    queryKey: ['subject-bill', subjectId],
    queryFn: async () => {
      const result = await getBillBySubject(subjectId);
      if (!result.ok) {
        if (result.error.message === 'Bill not found for subject') {
          return null;
        }
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(subjectId),
  });
}

/**
 * Returns an async callback (not a mutation) to download the bill PDF.
 * Uses a blob download pattern:
 *   1. Fetch the PDF endpoint.
 *   2. Convert the response to a Blob.
 *   3. Create a temporary <a> element, trigger click, then clean up.
 * The filename is read from the Content-Disposition header when available.
 */
export function useDownloadBill() {
  return async (billId: string) => {
    const loadingId = toast.loading('Generating bill PDF...');
    try {
      const response = await fetch(`/api/bills/${billId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download bill');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fallbackName = `bill-${billId}.pdf`;
      const headerName = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replaceAll('"', '') ?? fallbackName;
      a.download = headerName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download bill');
    } finally {
      toast.dismiss(loadingId);
    }
  };
}

/**
 * Mutation to mark a bill as paid / due / waived and optionally record the
 * payment mode. Used by admin/office staff after the technician submits a bill.
 */
export function useUpdateBillPaymentStatus(subjectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ billId, paymentStatus, paymentMode }: { billId: string; paymentStatus: 'paid' | 'due' | 'waived'; paymentMode?: 'cash' | 'upi' | 'card' | 'cheque' }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/subjects/${subjectId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_payment_status', billId, paymentStatus, paymentMode }),
      });
      
      const json = await res.json() as { 
        ok: boolean
        data?: { id: string; payment_status: 'paid' | 'due' | 'waived' }
        error?: { userMessage: string }
      };
      
      if (!json.ok) throw new Error(json.error?.userMessage ?? 'Failed to update payment status');
      return json.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-bill', subjectId] });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      toast.success('Payment status updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/**
 * Mutation to edit an existing bill's charges and accessories.
 * Invalidates bill, accessories, detail, and list queries on success
 * so all totals on the page update without a manual refresh.
 */
export function useEditBill(subjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EditBillInput) => {
      const res = await fetch(`/api/subjects/${subjectId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = await res.json() as {
        ok: boolean;
        data?: { id: string; grand_total: number; accessories_total: number; visit_charge: number; service_charge: number };
        error?: { userMessage: string };
      };

      if (!json.ok) throw new Error(json.error?.userMessage ?? 'Failed to update bill');
      return json.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-bill', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', subjectId] });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
      toast.success('Bill updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
