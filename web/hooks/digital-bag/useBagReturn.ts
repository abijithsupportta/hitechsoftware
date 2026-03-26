import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DIGITAL_BAG_QUERY_KEYS } from '@/modules/digital-bag/digital-bag.constants';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';

interface ReturnItemInput {
  bag_item_id: string;
  quantity: number;
  notes?: string;
}

interface UseReturnBagItemOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useReturnBagItem(options?: UseReturnBagItemOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReturnItemInput) => {
      const response = await fetch('/api/digital-bag/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to return bag item');
      }

      return result.data;
    },
    onSuccess: (data, input) => {
      // Invalidate and refetch both bag and accessories
      queryClient.invalidateQueries({ queryKey: ['digital-bag', 'today'] }); // Invalidate all today sessions
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
}
