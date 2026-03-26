// ─────────────────────────────────────────────────────────────────────────────
// useCommission.ts
//
// TanStack Query hooks for the Commission and Performance tracking system.
//
// ARCHITECTURE
// UI → THIS FILE → Service → Repository → Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COMMISSION_QUERY_KEYS } from '@/modules/commission/commission.constants';
import {
  getSubjectCommission,
  setCommissionForSubject,
  getTechnicianEarnings,
  fetchLeaderboard,
  confirmSubjectEarnings,
  confirmAllTechnicianEarnings,
  fetchMonthlyChart,
} from '@/modules/commission/commission.service';
import type {
  SetCommissionInput,
  EarningsFilters,
  LeaderboardPeriod,
} from '@/modules/commission/commission.types';

export function useSubjectCommission(subjectId: string) {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.subjectCommission(subjectId),
    queryFn: async () => {
      const result = await getSubjectCommission(subjectId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(subjectId),
  });
}

export function useTechnicianEarnings(filters: EarningsFilters) {
  const techId = filters.technician_id ?? '';
  return useQuery({
    queryKey: [...COMMISSION_QUERY_KEYS.technicianEarnings(techId), filters.month, filters.year, filters.status, filters.page],
    queryFn: async () => {
      const result = await getTechnicianEarnings(filters);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(techId),
  });
}

export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.leaderboard(period),
    queryFn: async () => {
      const result = await fetchLeaderboard(period);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyChart(technicianId: string) {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.monthlyChart(technicianId),
    queryFn: async () => {
      const result = await fetchMonthlyChart(technicianId, 6);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(technicianId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { input: SetCommissionInput; userId: string }) => {
      const result = await setCommissionForSubject(params.input, params.userId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.subjectCommission(variables.input.subject_id),
      });
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.technicianEarnings(variables.input.technician_id),
      });
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.all,
      });
    },
  });
}

export function useConfirmEarnings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { subjectId: string; userId: string }) => {
      const result = await confirmSubjectEarnings(params.subjectId, params.userId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.subjectCommission(variables.subjectId),
      });
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.all,
      });
    },
  });
}

export function useConfirmAllEarnings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { technicianId: string; userId: string; month?: string; year?: string }) => {
      const result = await confirmAllTechnicianEarnings(
        params.technicianId,
        params.userId,
        params.month,
        params.year
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.technicianEarnings(variables.technicianId),
      });
      queryClient.invalidateQueries({
        queryKey: COMMISSION_QUERY_KEYS.all,
      });
    },
  });
}
