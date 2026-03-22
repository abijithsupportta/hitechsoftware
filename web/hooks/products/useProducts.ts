import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getProducts, addProduct, editProduct, removeProduct } from '@/modules/products/product.service';
import type { ProductFilters } from '@/modules/products/product.types';

const BASE_KEY = ['products'] as const;

export function useProducts() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, page_size: 20 });

  const queryKey = [...BASE_KEY, 'list', filters] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getProducts(filters),
    placeholderData: (prev) => prev,
  });

  const setSearch = useCallback((search: string) => {
    setSearchInput(search);
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setCategoryFilter = useCallback((category_id: string | undefined) => {
    setFilters((prev) => ({ ...prev, category_id, page: 1 }));
  }, []);

  const setTypeFilter = useCallback((product_type_id: string | undefined) => {
    setFilters((prev) => ({ ...prev, product_type_id, page: 1 }));
  }, []);

  const setStatusFilter = useCallback((is_active: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, is_active, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const createMutation = useMutation({
    mutationFn: addProduct,
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product created');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof editProduct>[1]) =>
      editProduct(id, data),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product updated');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeProduct(id),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product deleted');
      await queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const listResponse = query.data?.ok ? query.data.data : null;

  return {
    items: listResponse?.data ?? [],
    pagination: listResponse
      ? { total: listResponse.total, page: listResponse.page, pageSize: listResponse.page_size, totalPages: listResponse.total_pages }
      : null,
    filters,
    searchInput,
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    setSearch,
    setCategoryFilter,
    setTypeFilter,
    setStatusFilter,
    setPage,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
