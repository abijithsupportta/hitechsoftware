import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addServiceCategory,
  editServiceCategory,
  getServiceCategories,
  removeServiceCategory,
} from '@/modules/service-categories/service-category.service';

const KEY = ['service-categories'] as const;

export function useServiceCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getServiceCategories,
  });

  const createMutation = useMutation({
    mutationFn: addServiceCategory,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Service category added');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, is_active }: { id: string; name?: string; is_active?: boolean }) =>
      editServiceCategory(id, { name, is_active }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Service category updated');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeServiceCategory(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Service category deleted');
      queryClient.invalidateQueries({ queryKey: KEY });
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
