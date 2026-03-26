import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';

interface EditBillInput {
  visit_charge?: number;
  service_charge?: number;
  payment_mode?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'due';
  accessories?: Array<{
    id?: string;
    item_name: string;
    quantity: number;
    mrp: number;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
  }>;
}

interface UseEditBillOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useEditBill(billId: string, options?: UseEditBillOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EditBillInput) => {
      const response = await fetch(`/api/bills/${billId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to edit bill');
      }

      return result.data;
    },
    onSuccess: (data, input) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
      queryClient.invalidateQueries({ queryKey: ['subjects', data.subject_id, 'bill'] });
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', data.subject_id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
}

interface UseDeleteAccessoryOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useDeleteAccessory(billId: string, options?: UseDeleteAccessoryOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accessoryId: string) => {
      const response = await fetch(`/api/bills/${billId}/accessories/${accessoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to delete accessory');
      }

      return result.data;
    },
    onSuccess: (data, accessoryId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', billId] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
}
