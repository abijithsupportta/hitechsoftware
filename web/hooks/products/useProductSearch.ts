import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/modules/products/product.types';

interface UseProductSearchOptions {
  minChars?: number;
  enabled?: boolean;
}

export function useProductSearch(searchQuery: string, options: UseProductSearchOptions = {}) {
  const { minChars = 2, enabled = true } = options;

  return useQuery({
    queryKey: ['products', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < minChars) {
        return { data: [], total: 0 };
      }

      const params = new URLSearchParams({
        search: searchQuery.trim(),
        page_size: '10', // Limit to 10 results for dropdown
      });

      const response = await fetch(`/api/products?${params}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to search products');
      }

      return result.data;
    },
    enabled: enabled && searchQuery.length >= minChars,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
