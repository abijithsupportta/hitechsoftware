/**
 * useSubjectDetail
 *
 * Sole responsibility: fetch and cache a single subject's full detail record.
 * Kept separate from useSubjects.ts (list) so consumers of the detail page
 * do not need to pull in list-level filter state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSubjectDetails, saveSubjectWarranty } from '@/modules/subjects/subject.service';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';

export function useSubjectDetail(id: string) {
  return useQuery({
    queryKey: SUBJECT_QUERY_KEYS.detail(id),
    queryFn: () => getSubjectDetails(id),
    staleTime: 5000,
    enabled: Boolean(id),
  });
}

export function useSaveSubjectWarranty(subjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      subject_id: string;
      purchase_date: string | null;
      warranty_period: '6_months' | '1_year' | '2_years' | '3_years' | '4_years' | '5_years' | 'custom';
      warranty_end_date_manual: string | null;
    }) => saveSubjectWarranty(input),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success('Warranty details updated successfully');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) }),
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all }),
        ]);
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to update warranty details');
    },
  });
}
