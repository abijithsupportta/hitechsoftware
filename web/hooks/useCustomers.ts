'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CUSTOMER_DEFAULT_PAGE_SIZE,
  CUSTOMER_QUERY_KEYS,
} from '@/modules/customers/customer.constants';
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomerList,
  updateCustomer,
} from '@/modules/customers/customer.service';
import type { CreateCustomerInput, CustomerFilters, UpdateCustomerInput } from '@/modules/customers/customer.types';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export function useCustomers() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [filters, setFilters] = useState<{ area?: string; status: 'all' | 'active' | 'inactive'; page: number }>({
    area: undefined,
    status: 'all',
    page: 1,
  });

  const queryFilters = useMemo<CustomerFilters>(() => {
    const isActive =
      filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined;

    return {
      search: debouncedSearch || undefined,
      area: filters.area || undefined,
      is_active: isActive,
      page: filters.page,
      page_size: CUSTOMER_DEFAULT_PAGE_SIZE,
    };
  }, [debouncedSearch, filters.area, filters.page, filters.status]);

  const listQuery = useQuery({
    queryKey: [...CUSTOMER_QUERY_KEYS.list, queryFilters],
    queryFn: () => getCustomerList(queryFilters),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Customer created successfully');
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) => updateCustomer(id, input),
    onSuccess: (result, variables) => {
      if (result.ok) {
        toast.success('Customer updated successfully');
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(variables.id) });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onMutate: async (customerId) => {
      // Cancel any in-flight list refetches so they don't overwrite the optimistic update.
      await queryClient.cancelQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });

      // Snapshot all list caches for rollback.
      const previousData = queryClient.getQueriesData({ queryKey: CUSTOMER_QUERY_KEYS.list });

      // Optimistically remove the customer from every cached list page.
      queryClient.setQueriesData(
        { queryKey: CUSTOMER_QUERY_KEYS.list },
        (old: unknown) => {
          if (!old || typeof old !== 'object' || !('ok' in old) || !(old as { ok: boolean }).ok) return old;
          const typed = old as { ok: true; data: { data: { id: string }[]; total: number; page: number; page_size: number; total_pages: number } };
          return {
            ...typed,
            data: {
              ...typed.data,
              data: typed.data.data.filter((c) => c.id !== customerId),
              total: Math.max(0, typed.data.total - 1),
            },
          };
        },
      );

      return { previousData };
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Customer deleted successfully');
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      }
    },
    onError: (_error, _customerId, context) => {
      // Roll back optimistic update on network/server error.
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete customer. Please try again.');
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
    },
  });

  return {
    customers: listQuery.data?.ok ? listQuery.data.data.data : [],
    pagination: listQuery.data?.ok
      ? {
          page: listQuery.data.data.page,
          pageSize: listQuery.data.data.page_size,
          total: listQuery.data.data.total,
          totalPages: listQuery.data.data.total_pages,
        }
      : {
          page: 1,
          pageSize: CUSTOMER_DEFAULT_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        },
    filters,
    searchInput,
    isLoading: listQuery.isLoading,
    error:
      (listQuery.data && !listQuery.data.ok && listQuery.data.error.message) ||
      (listQuery.error instanceof Error ? listQuery.error.message : null),
    createCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    setSearch: (value: string) => {
      setSearchInput(value);
      setFilters((prev) => ({ ...prev, page: 1 }));
    },
    setArea: (value: string) => {
      setFilters((prev) => ({ ...prev, area: value || undefined, page: 1 }));
    },
    setStatus: (value: 'all' | 'active' | 'inactive') => {
      setFilters((prev) => ({ ...prev, status: value, page: 1 }));
    },
    setPage: (value: number) => {
      setFilters((prev) => ({ ...prev, page: Math.max(1, value) }));
    },
  };
}

export function useCustomer(customerId?: string) {
  const detailQuery = useQuery({
    queryKey: customerId ? CUSTOMER_QUERY_KEYS.detail(customerId) : [...CUSTOMER_QUERY_KEYS.detail('unknown')],
    queryFn: async () => {
      if (!customerId) {
        return {
          ok: false as const,
          error: { message: 'Customer id is required' },
        };
      }

      return getCustomerById(customerId);
    },
    enabled: Boolean(customerId),
  });

  return {
    customer: detailQuery.data?.ok ? detailQuery.data.data : null,
    isLoading: detailQuery.isLoading,
    error:
      (detailQuery.data && !detailQuery.data.ok && detailQuery.data.error.message) ||
      (detailQuery.error instanceof Error ? detailQuery.error.message : null),
  };
}
