// ═════════════════════════════════════════════════════════════════════════════
// useAMC.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC (Annual Maintenance Contract) React Query Hooks for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

import { 
  AMCContractWithDetails, 
  AMCListItem, 
  AMCFilters,
  AMCPaginationParams,
  AMCListResponse,
  AMCDashboardSummary,
  AMCSalesSummary,
  AMCDetectionResult,
  CreateAMCInput,
  UpdateAMCInput,
  RenewAMCInput,
  CancelAMCInput,
  SetAMCCommissionInput,
  AMCCreateResponse,
  AMCRenewalResponse
} from '@/modules/amc/amc.types';
import { AMC_QUERY_KEYS, AMC_SUCCESS_MESSAGES } from '@/modules/amc/amc.constants';
import { amcService } from '@/modules/amc/amc.service';

// ═════════════════════════════════════════════════════════════════════════════
// AMC LIST HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useAMCList = (filters: AMCFilters, pagination: AMCPaginationParams) => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.list(filters),
    queryFn: () => amcService.listAMCs(filters, pagination),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (response) => response.success ? response.data : null
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// AMC DETAIL HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useAMCById = (id: string) => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.detail(id),
    queryFn: () => amcService.getAMCById(id),
    enabled: !!id,
    select: (response) => response.success ? response.data : null
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMER AMC HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useCustomerAMCs = (customerId: string) => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.customerAMCs(customerId),
    queryFn: () => amcService.getCustomerAMCs(customerId),
    enabled: !!customerId,
    select: (response) => response.success ? response.data : []
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPIRING AMC HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useExpiringAMCs = (days: number = 30) => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.expiring(days),
    queryFn: () => amcService.getExpiringAMCs(days),
    refetchInterval: 60 * 60 * 1000, // 1 hour
    select: (response) => response.success ? response.data : []
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useAMCDashboard = () => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.dashboard(),
    queryFn: () => amcService.getDashboardSummary(),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    select: (response) => response.success ? response.data : null
  });
};

export const useAMCSalesSummary = (technicianId?: string, period: string = 'month') => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.salesSummary(technicianId, period),
    queryFn: () => amcService.getAMCSalesSummary(technicianId, period),
    select: (response) => response.success ? response.data : null
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// ACTIVE AMC CHECK HOOK
// ═════════════════════════════════════════════════════════════════════════════

export const useCheckActiveAMC = (
  customerId: string,
  categoryId: string,
  brand: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: AMC_QUERY_KEYS.activeAMC(customerId, categoryId, brand),
    queryFn: () => amcService.checkActiveAMCForSubject(customerId, categoryId, brand),
    enabled: enabled && !!(customerId && categoryId && brand)
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useCreateAMC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userId }: { input: CreateAMCInput; userId: string }) =>
      amcService.createAMC(input, userId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success(`${AMC_SUCCESS_MESSAGES.CREATED}: ${response.data.contract_number}`);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.lists() });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.dashboard() });
        queryClient.invalidateQueries({ 
          queryKey: AMC_QUERY_KEYS.customerAMCs(response.data.amc.customer_id) 
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to create AMC contract');
      console.error('Create AMC Error:', error);
    }
  });
};

export const useUpdateAMC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      input, 
      userId 
    }: { id: string; input: UpdateAMCInput; userId: string }) =>
      amcService.updateAMC(id, input, userId),
    onSuccess: (response, variables) => {
      if (response.success) {
        toast.success(AMC_SUCCESS_MESSAGES.UPDATED);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.lists() });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ 
          queryKey: AMC_QUERY_KEYS.customerAMCs(response.data.customer_id) 
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to update AMC contract');
      console.error('Update AMC Error:', error);
    }
  });
};

export const useRenewAMC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      existingAMCId, 
      input, 
      userId 
    }: { existingAMCId: string; input: RenewAMCInput; userId: string }) =>
      amcService.renewAMC(existingAMCId, input, userId),
    onSuccess: (response, variables) => {
      if (response.success) {
        toast.success(AMC_SUCCESS_MESSAGES.RENEWED);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.lists() });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.detail(variables.existingAMCId) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.detail(response.data.new_amc.id) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.dashboard() });
        queryClient.invalidateQueries({ 
          queryKey: AMC_QUERY_KEYS.customerAMCs(response.data.new_amc.customer_id) 
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to renew AMC contract');
      console.error('Renew AMC Error:', error);
    }
  });
};

export const useCancelAMC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      input, 
      userId 
    }: { id: string; input: CancelAMCInput; userId: string }) =>
      amcService.cancelAMC(id, input, userId),
    onSuccess: (response, variables) => {
      if (response.success) {
        toast.success(AMC_SUCCESS_MESSAGES.CANCELLED);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.lists() });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ 
          queryKey: AMC_QUERY_KEYS.customerAMCs(response.data.customer_id) 
        });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.dashboard() });
      }
    },
    onError: (error) => {
      toast.error('Failed to cancel AMC contract');
      console.error('Cancel AMC Error:', error);
    }
  });
};

export const useSetAMCCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      amcId, 
      input, 
      userId 
    }: { amcId: string; input: SetAMCCommissionInput; userId: string }) =>
      amcService.setAMCCommission(amcId, input, userId),
    onSuccess: (response, variables) => {
      if (response.success) {
        toast.success(AMC_SUCCESS_MESSAGES.COMMISSION_SET);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.detail(variables.amcId) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.lists() });
        queryClient.invalidateQueries({ 
          queryKey: AMC_QUERY_KEYS.customerAMCs(response.data.customer_id) 
        });
        
        // Invalidate commission-related queries
        queryClient.invalidateQueries({ queryKey: ['technician', 'earnings'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      }
    },
    onError: (error) => {
      toast.error('Failed to set commission');
      console.error('Set Commission Error:', error);
    }
  });
};

export const useSendExpiryNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => amcService.sendExpiryNotifications(),
    onSuccess: (response) => {
      if (response.success) {
        const { sent, failed } = response.data;
        
        if (sent > 0) {
          toast.success(`Sent ${sent} WhatsApp notifications successfully`);
        }
        
        if (failed > 0) {
          toast.error(`Failed to send ${failed} notifications`);
        }
        
        // Invalidate expiring AMCs queries
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.expiring(30) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.expiring(15) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.expiring(7) });
        queryClient.invalidateQueries({ queryKey: AMC_QUERY_KEYS.expiring(1) });
      }
    },
    onError: (error) => {
      toast.error('Failed to send expiry notifications');
      console.error('Send Notifications Error:', error);
    }
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export const useAMCPagination = (defaultLimit: number = 20) => {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(defaultLimit);

  const pagination: AMCPaginationParams = React.useMemo(() => ({
    page,
    limit,
    offset: (page - 1) * limit
  }), [page, limit]);

  const totalPages = React.useCallback((total: number) => {
    return Math.ceil(total / limit);
  }, [limit]);

  const nextPage = React.useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const previousPage = React.useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToPage = React.useCallback((targetPage: number) => {
    setPage(Math.max(1, targetPage));
  }, []);

  const resetPagination = React.useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    limit,
    setLimit,
    pagination,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    resetPagination
  };
};

export const useAMCFilters = (initialFilters: Partial<AMCFilters> = {}) => {
  const [filters, setFilters] = React.useState<AMCFilters>(initialFilters);

  const updateFilter = React.useCallback((key: keyof AMCFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters
  };
};
