'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTechnicianEarnings } from '@/hooks/commission/useCommission';
import { ROUTES } from '@/lib/constants/routes';

interface Props {
  technicianId: string;
  userRole: string | null;
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function TechnicianEarningsTab({ technicianId, userRole }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));
  const [page, setPage] = useState(1);

  const earningsQuery = useTechnicianEarnings({
    technician_id: technicianId,
    month: selectedMonth,
    year: selectedYear,
    page,
    page_size: 20,
  });

  const summary = earningsQuery.data?.summary;
  const items = earningsQuery.data?.items ?? [];
  const total = earningsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Services Completed', value: String(summary.total_services), color: 'blue' },
      { label: 'Total Bill Generated', value: `₹${formatMoney(summary.total_bill_generated)}`, color: 'slate' },
      { label: 'Parts Sold', value: `₹${formatMoney(summary.total_parts_sold)}`, color: 'violet' },
      { label: 'Extra Collected', value: `₹${formatMoney(summary.total_extra_collected)}`, color: 'amber' },
      { label: 'Net Earnings', value: `₹${formatMoney(summary.total_net_earnings)}`, color: 'emerald' },
      { label: 'Pending Confirmation', value: String(summary.pending_count), color: 'rose' },
    ];
  }, [summary]);

  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  return (
    <div className="space-y-4">
      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{selectedYear}</span>
      </div>

      {/* Summary Cards */}
      {earningsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-2 h-5 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border p-3 ${colorMap[card.color] ?? colorMap.slate}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</p>
              <p className="mt-1 text-lg font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Earnings Table */}
      {earningsQuery.isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No earnings data for this month.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Bill</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Parts Sold</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Extra</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Svc Comm.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Parts Comm.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Extra Comm.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Variance</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Net</th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const raw = item as unknown as Record<string, unknown>;
                const subjectData = raw.subject as { id?: string; ticket_number?: string } | null | undefined;
                const subjectId = subjectData?.id ?? item.subject_id;
                const subjectNumber = subjectData?.ticket_number ?? item.subject_id.slice(0, 8);

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.DASHBOARD_SUBJECTS_DETAIL(subjectId)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {subjectNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.total_bill_value)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.parts_sold_value)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.extra_price_collected)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.service_commission)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.parts_commission)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.extra_price_commission)}</td>
                    <td className="px-3 py-2 text-right text-rose-600">-₹{formatMoney(item.variance_deduction)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">₹{formatMoney(item.net_earnings)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.earnings_status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.earnings_status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
