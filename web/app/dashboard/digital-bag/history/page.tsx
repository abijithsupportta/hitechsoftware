'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Eye, History, ChevronDown, ChevronUp } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useSessionHistory } from '@/hooks/digital-bag/useDigitalBag';
import { useTeam } from '@/hooks/team/useTeam';
import { ROUTES } from '@/lib/constants/routes';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import type { SessionHistoryFilters, DigitalBagSession } from '@/modules/digital-bag/digital-bag.types';

export default function DigitalBagHistoryPage() {
  const { can } = usePermission();
  const { members } = useTeam();
  const technicians = members.filter((m) => m.role === 'technician');

  const [filters, setFilters] = useState<SessionHistoryFilters>({ page: 1, page_size: 20 });
  const { sessions, pagination, isLoading, error } = useSessionHistory(filters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  if (!can('digital-bag:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Digital Bag module.</div>;
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <Link href={ROUTES.DASHBOARD_DIGITAL_BAG} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Back to Digital Bag
        </Link>
        <div className="flex items-center gap-3">
          <History className="text-blue-600" size={20} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Bag Session History</h1>
            <p className="mt-0.5 text-sm text-slate-500">All closed bag sessions.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.technician_id ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, technician_id: e.target.value || undefined, page: 1 }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Technicians</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.display_name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value || undefined, page: 1 }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={filters.date_to ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value || undefined, page: 1 }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="To"
        />
      </div>

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Technician</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Returned</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Variance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Damage Fees</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              : sessions.length === 0
                ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Briefcase size={32} className="opacity-40" />
                          <p className="text-sm">No closed sessions found.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : sessions.map((session: DigitalBagSession) => (
                    <Fragment key={session.id}>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {expandedId === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{session.session_date}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{session.technician?.display_name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {SESSION_STATUS_LABELS[session.status] ?? session.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{session.total_issued}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{session.total_returned}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{session.total_consumed}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${session.variance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {session.variance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {(session.total_damage_fees ?? 0) > 0 ? `₹${(session.total_damage_fees ?? 0).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={ROUTES.DASHBOARD_DIGITAL_BAG_DETAIL(session.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Eye size={14} /> View
                          </Link>
                        </td>
                      </tr>
                      {expandedId === session.id && session.items && (
                        <tr>
                          <td colSpan={10} className="px-6 py-3 bg-slate-50/50">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-slate-500 uppercase">
                                  <th className="text-left py-1 pr-4">Product</th>
                                  <th className="text-left py-1 pr-4">Issued</th>
                                  <th className="text-left py-1 pr-4">Returned</th>
                                  <th className="text-left py-1 pr-4">Missing</th>
                                  <th className="text-left py-1 pr-4">Damage Fee</th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.items.map((item) => (
                                  <tr key={item.id} className="text-slate-700">
                                    <td className="py-1 pr-4 font-medium">{item.product_name ?? '—'}</td>
                                    <td className="py-1 pr-4">{item.quantity_issued}</td>
                                    <td className="py-1 pr-4">{item.quantity_returned}</td>
                                    <td className="py-1 pr-4">
                                      <span className={(item.quantity_missing ?? 0) > 0 ? 'text-rose-600 font-medium' : ''}>
                                        {item.quantity_missing ?? 0}
                                      </span>
                                    </td>
                                    <td className="py-1 pr-4">
                                      {(item.total_damage_fee ?? 0) > 0 ? `₹${(item.total_damage_fee ?? 0).toFixed(2)}` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
