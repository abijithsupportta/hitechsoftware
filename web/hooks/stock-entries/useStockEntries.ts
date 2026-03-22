import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addStockEntry, getStockEntries, removeStockEntry } from '@/modules/stock-entries/stock-entry.service';
import type { StockEntryFilters } from '@/modules/stock-entries/stock-entry.types';

const BASE_KEY = ['stock-entries'] as const;

export function useStockEntries() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<StockEntryFilters>({ page: 1, page_size: 20 });

  const queryKey = [...BASE_KEY, 'list', filters] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getStockEntries(filters),
    placeholderData: (prev) => prev,
  });

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const createMutation = useMutation({
    mutationFn: addStockEntry,
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Stock entry recorded');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeStockEntry(id),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Stock entry deleted');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const listResponse = query.data?.ok ? query.data.data : null;

  return {
    entries: listResponse?.data ?? [],
    pagination: listResponse
      ? { total: listResponse.total, page: listResponse.page, pageSize: listResponse.page_size, totalPages: listResponse.total_pages }
      : null,
    filters,
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    setSearch,
    setPage,
    createMutation,
    deleteMutation,
  };
}
