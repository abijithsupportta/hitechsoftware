import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addProductType,
  editProductType,
  getProductTypes,
  removeProductType,
} from '@/modules/product-types/product-type.service';

const KEY = ['product-types'] as const;

export function useProductTypes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getProductTypes,
  });

  const createMutation = useMutation({
    mutationFn: addProductType,
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product type added');
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, is_active }: { id: string; name?: string; is_active?: boolean }) =>
      editProductType(id, { name, is_active }),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product type updated');
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeProductType(id),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Product type deleted');
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  return {
    data: query.data?.ok ? query.data.data : [],
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
