/**
 * useSubjectAssignment
 *
 * Sole responsibility: mutations and queries related to assigning a technician
 * to a subject. Extracted from the monolithic useSubjects.ts.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { assignSubjectToTechnician, assignTechnicianWithDate } from '@/modules/subjects/subject.service';
import { getAssignableTechnicians } from '@/modules/technicians/technician.service';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import type { AssignTechnicianInput } from '@/modules/subjects/subject.types';

export function useAssignableTechnicians() {
  return useQuery({
    queryKey: SUBJECT_QUERY_KEYS.assignableTechnicians,
    queryFn: getAssignableTechnicians,
    staleTime: 60 * 1000,
  });
}

/** Full assignment with date, notes, and validation (used on detail page). */
export function useAssignTechnician(subjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignTechnicianInput) => assignTechnicianWithDate(input),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success('Technician assignment saved successfully');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) }),
        ]);
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to save technician assignment');
    },
  });
}

/** Quick (inline) assignment used on the list page. */
export function useQuickAssignTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId, technicianId }: { subjectId: string; technicianId?: string }) =>
      assignSubjectToTechnician(subjectId, technicianId),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success('Technician assignment updated');
        await queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to update assignment');
    },
  });
}
