/**
 * @file useDigitalBag.ts
 * @module hooks/digital-bag
 *
 * React Query hook for digital bag sessions, items, and consumptions.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSessions,
  getSessionDetail,
  createBagSession,
  closeBagSession,
  returnItems,
  consumeItem,
  getTechnicianBag,
} from '@/modules/digital-bag/digital-bag.service';
import type { BagSessionFilters, CreateSessionInput, ReturnItemsInput, ConsumeItemInput } from '@/modules/digital-bag/digital-bag.types';

const BASE_KEY = ['digital-bag'] as const;

export function useDigitalBagSessions() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BagSessionFilters>({ page: 1, page_size: 20 });
  const queryKey = [...BASE_KEY, 'sessions', filters] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getSessions(filters),
    placeholderData: (prev) => prev,
  });

  const setTechnicianFilter = useCallback((technician_id: string | undefined) => {
    setFilters((prev) => ({ ...prev, technician_id, page: 1 }));
  }, []);

  const setStatusFilter = useCallback((status: BagSessionFilters['status']) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: { input: CreateSessionInput; issuedBy: string }) =>
      createBagSession(data.input, data.issuedBy),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Bag session created');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
      await queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: { sessionId: string; notes?: string }) =>
      closeBagSession(data.sessionId, data.notes),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Bag session closed');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const listResponse = query.data?.ok ? query.data.data : null;

  return {
    sessions: listResponse?.data ?? [],
    pagination: listResponse
      ? { total: listResponse.total, page: listResponse.page, pageSize: listResponse.page_size, totalPages: listResponse.total_pages }
      : null,
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    filters,
    setTechnicianFilter,
    setStatusFilter,
    setPage,
    createMutation,
    closeMutation,
  };
}

export function useDigitalBagSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: [...BASE_KEY, 'detail', sessionId],
    queryFn: () => getSessionDetail(sessionId!),
    enabled: !!sessionId,
  });
}

export function useReturnItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReturnItemsInput) => returnItems(input),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Items returned');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
      await queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

export function useConsumeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { input: ConsumeItemInput; technicianId: string }) =>
      consumeItem(data.input, data.technicianId),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Item consumed');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });
}

export function useTechnicianBag(technicianId: string | null) {
  return useQuery({
    queryKey: [...BASE_KEY, 'my-bag', technicianId],
    queryFn: () => getTechnicianBag(technicianId!),
    enabled: !!technicianId,
  });
}
