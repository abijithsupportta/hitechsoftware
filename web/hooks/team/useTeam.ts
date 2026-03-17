'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TEAM_QUERY_KEYS } from '@/modules/technicians/technician.constants';
import { createTeamMember, deleteTeamMember, getTeamMembers, updateTeamMember } from '@/modules/technicians/technician.service';
import type { CreateTeamMemberInput, TeamFilters, UpdateTeamMemberInput } from '@/modules/technicians/technician.types';
import type { UserRole } from '@/types/database.types';

export function useTeam() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TeamFilters>({ role: 'all', search: '' });

  const queryFilters = useMemo(() => ({ ...filters }), [filters]);

  const listQuery = useQuery({
    queryKey: [...TEAM_QUERY_KEYS.list, queryFilters],
    queryFn: () => getTeamMembers(queryFilters),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTeamMemberInput) => createTeamMember(input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Team member added successfully');
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeamMemberInput }) => updateTeamMember(id, input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Team member updated successfully');
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: TEAM_QUERY_KEYS.all });

      const previousData = queryClient.getQueriesData({ queryKey: TEAM_QUERY_KEYS.list });

      queryClient.setQueriesData(
        { queryKey: TEAM_QUERY_KEYS.list },
        (old: unknown) => {
          if (!old || typeof old !== 'object' || !('ok' in old) || !(old as { ok: boolean }).ok) {
            return old;
          }

          const typed = old as { ok: true; data: { id: string }[] };
          return {
            ...typed,
            data: typed.data.filter((member) => member.id !== memberId),
          };
        },
      );

      return { previousData };
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Team member deleted successfully');
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      }
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete team member. Please try again.');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
    },
  });

  return {
    members: listQuery.data?.ok ? listQuery.data.data : [],
    isLoading: listQuery.isLoading,
    error:
      (listQuery.data && !listQuery.data.ok && listQuery.data.error.message) ||
      (listQuery.error instanceof Error ? listQuery.error.message : null),
    filters,
    createMutation,
    updateMutation,
    deleteMutation,
    setRoleFilter: (role: UserRole | 'all') => setFilters((prev) => ({ ...prev, role })),
    setSearchFilter: (search: string) => setFilters((prev) => ({ ...prev, search })),
  };
}
