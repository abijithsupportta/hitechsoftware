import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useConsolidatedInvoices(entityType: 'brand' | 'dealer', entityId: string) {
  return useQuery({
    queryKey: ['consolidated-invoices', entityType, entityId],
    queryFn: async () => {
      const response = await fetch(`/api/consolidated-invoices?entity_type=${entityType}&entity_id=${entityId}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load consolidated invoices');
      }
      return payload.data as Array<Record<string, unknown>>;
    },
    enabled: Boolean(entityId),
  });
}

export function useCreateConsolidatedInvoice(entityType: 'brand' | 'dealer', entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { month: number; year: number; notes?: string }) => {
      const response = await fetch('/api/consolidated-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          month: input.month,
          year: input.year,
          notes: input.notes ?? null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to create consolidated invoice');
      }
      return payload.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-invoices', entityType, entityId] });
    },
  });
}

export function useRecordConsolidatedInvoicePayment(entityType: 'brand' | 'dealer', entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoiceId: string; payment_mode: string; notes?: string }) => {
      const response = await fetch(`/api/consolidated-invoices/${input.invoiceId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: input.payment_mode, notes: input.notes ?? null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to record consolidated payment');
      }
      return payload.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-invoices', entityType, entityId] });
    },
  });
}
