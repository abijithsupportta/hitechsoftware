import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';

interface MarkCompleteInput {
  notes?: string;
}

interface UseMarkCompleteOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useMarkComplete(subjectId: string, options?: UseMarkCompleteOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkCompleteInput) => {
      const response = await fetch(`/api/subjects/${subjectId}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_complete',
          ...input,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to mark job as complete');
      }

      return result.data;
    },
    onSuccess: (data, input) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
}
