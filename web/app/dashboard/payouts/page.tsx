'use client';

import { useState } from 'react';
import { DollarSign, Search, CheckCircle, CreditCard } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { usePayouts } from '@/hooks/digital-bag/usePayouts';
import { useAuthStore } from '@/stores/auth.store';
import { PAYOUT_STATUS_LABELS, PAYOUT_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import type { PayoutStatus } from '@/modules/digital-bag/digital-bag.types';

export default function PayoutsPage() {
  const { can } = usePermission();
  const user = useAuthStore((s) => s.user);
  const {
    payouts, pagination, isLoading, error,
    setSearch, setStatusFilter, setPage,
    approveMutation, markPaidMutation,
  } = usePayouts();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilterVal, setStatusFilterVal] = useState<PayoutStatus | ''>('');

  if (!can('payout:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Payouts module.</div>;
  }

  function formatMoney(value: number) {
    return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const totalPending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.final_amount), 0);
  const totalApproved = payouts.filter((p) => p.status === 'approved').reduce((s, p) => s + Number(p.final_amount), 0);

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="text-blue-600" size={20} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Technician Payouts</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage service payout records for technicians.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{pagination?.total ?? 0}</p>
          <p className="text-xs text-slate-500">Total Payouts</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-2xl font-bold text-yellow-700">INR {formatMoney(totalPending)}</p>
          <p className="text-xs text-yellow-600">Pending Amount</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">INR {formatMoney(totalApproved)}</p>
          <p className="text-xs text-blue-600">Approved (Unpaid)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearch(e.target.value);
            }}
            placeholder="Search by ticket number…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilterVal}
          onChange={(e) => {
            const val = e.target.value as PayoutStatus | '';
            setStatusFilterVal(val);
            setStatusFilter(val || undefined);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Technician</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Base</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Deductions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Final</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              : payouts.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <DollarSign size={32} className="opacity-40" />
                          <p className="text-sm">No payouts found.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{payout.technician?.display_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {payout.subject?.ticket_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">INR {formatMoney(payout.base_amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {Number(payout.deductions) + Number(payout.variance_deduction) > 0
                          ? `INR ${formatMoney(Number(payout.deductions) + Number(payout.variance_deduction))}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        INR {formatMoney(payout.final_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYOUT_STATUS_COLORS[payout.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(payout.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {payout.status === 'pending' && can('payout:edit') && (
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate({ id: payout.id, approvedBy: user?.id ?? '' })}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                          )}
                          {payout.status === 'approved' && can('payout:edit') && (
                            <button
                              type="button"
                              onClick={() => markPaidMutation.mutate(payout.id)}
                              disabled={markPaidMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              <CreditCard size={12} /> Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
