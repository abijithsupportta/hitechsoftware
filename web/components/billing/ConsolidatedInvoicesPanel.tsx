'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useConsolidatedInvoices,
  useCreateConsolidatedInvoice,
  useRecordConsolidatedInvoicePayment,
} from '@/hooks/billing/useConsolidatedInvoices';

interface Props {
  entityType: 'brand' | 'dealer';
  entityId: string;
}

export function ConsolidatedInvoicesPanel({ entityType, entityId }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentMode, setPaymentMode] = useState('bank_transfer');

  const invoicesQuery = useConsolidatedInvoices(entityType, entityId);
  const createMutation = useCreateConsolidatedInvoice(entityType, entityId);
  const payMutation = useRecordConsolidatedInvoicePayment(entityType, entityId);

  const paidCount = useMemo(
    () => (invoicesQuery.data ?? []).filter((row) => row.payment_status === 'paid').length,
    [invoicesQuery.data],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Consolidated Invoices</h3>
        <div className="text-xs text-slate-500">Paid: {paidCount} / {(invoicesQuery.data ?? []).length}</div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} className="rounded-lg border border-slate-300 px-3 py-2" />
        <button
          type="button"
          onClick={() => createMutation.mutate(
            { month, year },
            {
              onSuccess: (data) => toast.success(`Invoice ${String(data.invoice_number)} created`),
              onError: (error) => toast.error(error.message),
            },
          )}
          disabled={createMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-left">Month</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(invoicesQuery.data ?? []).map((row) => (
              <tr key={String(row.id)}>
                <td className="px-3 py-2 font-semibold">{String(row.invoice_number)}</td>
                <td className="px-3 py-2">{String(row.month)}/{String(row.year)}</td>
                <td className="px-3 py-2">INR {Number(row.total_amount ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2">{String(row.payment_status)}</td>
                <td className="px-3 py-2">
                  {row.payment_status !== 'paid' ? (
                    <div className="flex items-center gap-2">
                      <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => payMutation.mutate(
                          { invoiceId: String(row.id), payment_mode: paymentMode },
                          {
                            onSuccess: () => toast.success('Payment recorded'),
                            onError: (error) => toast.error(error.message),
                          },
                        )}
                        className="rounded bg-emerald-600 px-3 py-1 text-white"
                      >
                        Mark Paid
                      </button>
                    </div>
                  ) : (
                    <span className="text-emerald-700">Paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
