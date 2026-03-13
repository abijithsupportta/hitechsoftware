import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addBrand, getBrands, renameBrand, removeBrand, setBrandActive } from '@/modules/brands/brand.service';

const KEY = ['brands'] as const;

export function useBrands() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getBrands,
  });

  const createMutation = useMutation({
    mutationFn: addBrand,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Brand added');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameBrand(id, { name }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Brand renamed');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setBrandActive(id, isActive),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Brand updated');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeBrand(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Brand deleted');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  return {
    data: query.data?.ok ? query.data.data : [],
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    createMutation,
    renameMutation,
    toggleMutation,
    deleteMutation,
  };
}
