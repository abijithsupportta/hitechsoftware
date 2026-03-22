import { useQuery } from '@tanstack/react-query';
import { getProduct } from '@/modules/products/product.service';

export function useProduct(id: string | undefined) {
  const query = useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => getProduct(id!),
    enabled: !!id,
  });

  return {
    product: query.data?.ok ? query.data.data : null,
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
  };
}
