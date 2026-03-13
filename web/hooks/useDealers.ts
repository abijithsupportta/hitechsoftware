import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addDealer, getDealers, removeDealer, setDealerActive } from '@/modules/dealers/dealer.service';

const KEY = ['dealers'] as const;

export function useDealers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getDealers,
  });

  const createMutation = useMutation({
    mutationFn: addDealer,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dealer added');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setDealerActive(id, isActive),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dealer updated');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeDealer(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dealer deleted');
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  return {
    data: query.data?.ok ? query.data.data : [],
    isLoading: query.isLoading,
    error: query.data && !query.data.ok ? query.data.error.message : null,
    createMutation,
    toggleMutation,
    deleteMutation,
  };
}
