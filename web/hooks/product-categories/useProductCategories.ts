import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addProductCategory,
  editProductCategory,
  getProductCategories,
  removeProductCategory,
} from '@/modules/product-categories/product-category.service';

const KEY = ['product-categories'] as const;

export function useProductCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getProductCategories,
  });

  const createMutation = useMutation({
    mutationFn: addProductCategory,
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Category added');
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, is_active }: { id: string; name?: string; is_active?: boolean }) =>
      editProductCategory(id, { name, is_active }),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Category updated');
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeProductCategory(id),
    onSuccess: async (result) => {
      if (!result.ok) { toast.error(result.error.message); return; }
      toast.success('Category deleted');
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
