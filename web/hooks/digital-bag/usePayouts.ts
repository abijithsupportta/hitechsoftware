/**
 * @file usePayouts.ts
 * @module hooks/digital-bag
 *
 * React Query hook for technician service payouts.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPayouts,
  addPayout,
  editPayout,
  approvePayoutRecord,
  markPayoutAsPaid,
} from '@/modules/digital-bag/payout.service';
import type { PayoutFilters, CreatePayoutInput, UpdatePayoutInput } from '@/modules/digital-bag/digital-bag.types';

const BASE_KEY = ['payouts'] as const;

export function usePayouts() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PayoutFilters>({ page: 1, page_size: 20 });
  const queryKey = [...BASE_KEY, 'list', filters] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getPayouts(filters),
    placeholderData: (prev) => prev,
  });

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setTechnicianFilter = useCallback((technician_id: string | undefined) => {
    setFilters((prev) => ({ ...prev, technician_id, page: 1 }));
  }, []);

  const setStatusFilter = useCallback((status: PayoutFilters['status']) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const createMutation = useMutation({
    mutationFn: (input: CreatePayoutInput) => addPayout(input),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Payout created');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; input: UpdatePayoutInput }) => editPayout(data.id, data.input),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Payout updated');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (data: { id: string; approvedBy: string }) =>
      approvePayoutRecord(data.id, data.approvedBy),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Payout approved');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => markPayoutAsPaid(id),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Payout marked as paid');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const listResponse = query.data?.ok ? query.data.data : null;

  return {
    payouts: listResponse?.data ?? [],
    pagination: listResponse
      ? { total: listResponse.total, page: listResponse.page, pageSize: listResponse.page_size, totalPages: listResponse.total_pages }
      : null,
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    filters,
    setSearch,
    setTechnicianFilter,
    setStatusFilter,
    setPage,
    createMutation,
    updateMutation,
    approveMutation,
    markPaidMutation,
  };
}
