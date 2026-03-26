import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConsumeItemInput } from '@/modules/digital-bag/digital-bag.types';
import { DIGITAL_BAG_QUERY_KEYS } from '@/modules/digital-bag/digital-bag.constants';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';

interface UseConsumeBagItemOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useConsumeBagItem(options?: UseConsumeBagItemOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConsumeItemInput) => {
      const response = await fetch('/api/digital-bag/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to consume bag item');
      }

      return result.data;
    },
    onMutate: async (input) => {
      // We need to get the technician_id from the session since it's not in the input
      // For now, we'll skip optimistic updates for bag consumption
      return { previousSession: null };
    },
    onError: (error, input, context) => {
      // No rollback needed since we skipped optimistic updates
      options?.onError?.(error as Error);
    },
    onSuccess: (data, input) => {
      // Invalidate and refetch both bag and accessories
      // Note: We can't invalidate the bag query without technician_id, but the component will handle this
      queryClient.invalidateQueries({ queryKey: ['subject-accessories', input.subject_id] });
      options?.onSuccess?.(data);
    },
  });
}
