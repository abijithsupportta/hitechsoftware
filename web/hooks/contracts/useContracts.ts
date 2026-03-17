import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CONTRACT_QUERY_KEYS } from '@/modules/contracts/contract.constants';
import { createContract, deleteContract, getContractsBySubject } from '@/modules/contracts/contract.service';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import type { CreateContractInput } from '@/modules/contracts/contract.types';

export function useContractsBySubject(subjectId: string) {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.bySubject(subjectId),
    queryFn: () => getContractsBySubject(subjectId),
    enabled: Boolean(subjectId),
  });
}

export function useCreateContract(subjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateContractInput) => createContract(input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Contract created successfully');
        queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.bySubject(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to create contract');
    },
  });
}

export function useDeleteContract(subjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      const confirmed = typeof window === 'undefined' ? true : window.confirm('Delete this contract?');
      if (!confirmed) {
        return { ok: false as const, error: { message: 'Deletion cancelled.' } };
      }
      return deleteContract(subjectId, contractId);
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Contract deleted successfully');
        queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.bySubject(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else if (result.error.message !== 'Deletion cancelled.') {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to delete contract');
    },
  });
}
