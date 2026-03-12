'use client';

import Link from 'next/link';
import { useSubjects } from '@/hooks/useSubjects';
import { ROUTES } from '@/lib/constants/routes';

export default function SubjectsDashboardPage() {
  const { subjects, pagination, searchInput, isLoading, error, setSearch, setPage } = useSubjects();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Tickets</h1>
          <p className="mt-1 text-sm text-slate-600">Track and create service tickets from CRM calls.</p>
        </div>

        <Link
          href={ROUTES.DASHBOARD_SUBJECTS_NEW}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create ticket
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
        <input
          value={searchInput}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by ticket id or problem"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading tickets...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No tickets yet.
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{subject.subject_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{subject.customer_name ?? '-'}</p>
                      <p className="text-xs text-slate-500">{subject.customer_phone ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.product_display ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.status}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.schedule_date ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
