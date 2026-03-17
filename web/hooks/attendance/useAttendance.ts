'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ATTENDANCE_QUERY_KEYS } from '@/modules/attendance/attendance.constants';
import {
  getAllTechnicianStatus,
  getAttendanceSummary,
  getTodayAttendance,
  toggleAttendance,
} from '@/modules/attendance/attendance.service';
import { useRealtime } from '@/hooks/useRealtime';

export function useTodayAttendance(technicianId: string) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.today(technicianId),
    queryFn: () => getTodayAttendance(technicianId),
    enabled: Boolean(technicianId),
    staleTime: 15 * 1000,
  });
}

export function useAttendanceSummary(technicianId: string, month: number, year: number) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.summary(technicianId, month, year),
    queryFn: () => getAttendanceSummary(technicianId, month, year),
    enabled: Boolean(technicianId) && month >= 1 && month <= 12 && year >= 2000,
    staleTime: 30 * 1000,
  });
}

export function useToggleAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (technicianId: string) => toggleAttendance(technicianId),
    onSuccess: (result, technicianId) => {
      if (result.ok) {
        if (result.data.message) {
          toast.message(result.data.message);
        } else {
          toast.success(result.data.status === 'online' ? 'Attendance marked ON' : 'Attendance marked OFF');
        }

        queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.today(technicianId) });
        queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.allTechnicianStatus });
        queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to toggle attendance');
    },
  });
}

export function useAllTechnicianStatus() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.allTechnicianStatus,
    queryFn: () => getAllTechnicianStatus(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  useEffect(() => {
    const unsubscribe = subscribe({
      channelName: 'attendance-profiles-online-status',
      schema: 'public',
      table: 'profiles',
      event: '*',
      filter: 'role=eq.technician',
      onChange: () => {
        queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.allTechnicianStatus });
      },
    });

    return () => {
      unsubscribe?.();
    };
  }, [queryClient, subscribe]);

  return query;
}
