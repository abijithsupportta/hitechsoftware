import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type CouponCreateInput = {
  discount_amount: number;
  expires_after: 'bill_creation' | 'service_completion';
};

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await fetch('/api/coupons');
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load coupons');
      }
      return payload.data as Array<Record<string, unknown>>;
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CouponCreateInput) => {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...input }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to create coupon');
      }
      return payload.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useApplyCoupon() {
  return useMutation({
    mutationFn: async (input: { code: string; subject_id: string }) => {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', ...input }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to apply coupon');
      }
      return payload.data as { id: string; coupon_code: string; discount_amount: number };
    },
  });
}
